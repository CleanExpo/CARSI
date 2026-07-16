/**
 * Course INTRO-video generator — the render half of the intro-video tool.
 *
 * Claude authors one brief per course in `data/video/course-intro-video-briefs.json`
 * (the ~50s presenter welcome). This script does the cost-bearing work: render an avatar
 * video via HeyGen, upload the MP4 to Cloudinary, and write the resulting URL into a
 * results map (`data/video/course-intro-video-results.json`). A separate, safe step —
 * `scripts/apply-intro-video-urls.ts` — writes those URLs into the catalog's introVideoUrl.
 *
 * This mirrors the HeyGen request shape used by `scripts/generate-course-lesson-videos.ts`
 * but is self-contained so the money-spending lesson pipeline is never touched.
 *
 * Phases / modifiers:
 *   --dry-run   Print the HeyGen payload per course. NO API, NO spend, NO secrets required.
 *   --generate  Real run: render → upload → write results map. Idempotent (skips done slugs).
 *   --slug=<s>  One course.  --limit=N  Cap renders.  --force  Re-render done slugs.
 *   --yes       Skip the interactive spend confirmation (non-interactive runs).
 *
 * Run MANUALLY with HEYGEN_API_KEY + HEYGEN_AVATAR_ID (+ Cloudinary) set. Never in CI/app runtime.
 */
import 'dotenv/config';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isCloudinaryConfigured, uploadVideoToCloudinary } from '../src/lib/server/cloudinary-upload';
import {
  isVideoBriefComplete,
  isVideoBriefsFile,
  type CourseLessonVideoBrief,
} from '../src/lib/video/course-lesson-video-briefs-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIEFS_PATH = join(__dirname, '..', 'data', 'video', 'course-intro-video-briefs.json');
const RESULTS_PATH = join(__dirname, '..', 'data', 'video', 'course-intro-video-results.json');

const HEYGEN_BASE_URL = 'https://api.heygen.com';
const HARD_CAP = Number(process.env.INTRO_VIDEO_MAX_GENERATIONS ?? 40);
const POLL_INTERVAL_MS = Number(process.env.LESSON_VIDEO_POLL_INTERVAL_MS ?? 5000);
const POLL_MAX_ATTEMPTS = Number(process.env.LESSON_VIDEO_POLL_MAX_ATTEMPTS ?? 120);
const VIDEO_FOLDER = process.env.INTRO_VIDEO_CLOUDINARY_FOLDER ?? 'carsi/course-intro';

const argValue = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const hasFlag = (n: string) => process.argv.includes(`--${n}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ResultsMap = { version: 1; results: Record<string, { url: string; captionsUrl?: string }> };

async function loadBriefs(): Promise<CourseLessonVideoBrief[]> {
  const parsed: unknown = JSON.parse(await readFile(BRIEFS_PATH, 'utf8'));
  if (!isVideoBriefsFile(parsed)) throw new Error(`Invalid intro briefs at ${BRIEFS_PATH}.`);
  return parsed.briefs;
}
async function loadResults(): Promise<ResultsMap> {
  try {
    const parsed = JSON.parse(await readFile(RESULTS_PATH, 'utf8')) as ResultsMap;
    if (parsed?.version === 1 && parsed.results) return parsed;
  } catch { /* none yet */ }
  return { version: 1, results: {} };
}
async function writeResults(r: ResultsMap): Promise<void> {
  await mkdir(dirname(RESULTS_PATH), { recursive: true });
  await writeFile(RESULTS_PATH, `${JSON.stringify(r, null, 1)}\n`, 'utf8');
}

function avatarPayload(brief: CourseLessonVideoBrief, dryRun: boolean) {
  const avatarId = brief.avatarId?.trim() || process.env.HEYGEN_AVATAR_ID?.trim();
  if (!avatarId && !dryRun) throw new Error('HEYGEN_AVATAR_ID is required (or set brief.avatarId).');
  return {
    type: 'avatar',
    avatar_id: avatarId ?? '<HEYGEN_AVATAR_ID-unset>',
    title: `CARSI Intro - ${brief.title}`,
    resolution: process.env.LESSON_VIDEO_RESOLUTION ?? '1080p',
    aspect_ratio: process.env.LESSON_VIDEO_ASPECT_RATIO ?? '16:9',
    background: { type: 'color', value: process.env.LESSON_VIDEO_BACKGROUND ?? '#060a14' },
    caption: brief.captions ? { file_format: 'srt', style: 'default' } : undefined,
    output_format: 'mp4',
    script: brief.script.trim(),
    voice_id: brief.voiceId?.trim() || process.env.HEYGEN_VOICE_ID || undefined,
    voice_settings: {
      speed: Number(process.env.LESSON_VIDEO_VOICE_SPEED ?? '0.96'),
      pitch: Number(process.env.LESSON_VIDEO_VOICE_PITCH ?? '0'),
      volume: Number(process.env.LESSON_VIDEO_VOICE_VOLUME ?? '1'),
      locale: brief.locale || 'en-AU',
    },
  };
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function heygenRequest<T>(apiKey: string, method: 'GET' | 'POST', route: string, body?: unknown): Promise<T> {
  const res = await fetch(`${HEYGEN_BASE_URL}${route}`, {
    method,
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HeyGen ${method} ${route} failed (${res.status}): ${text.slice(0, 400)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function renderVideo(apiKey: string, brief: CourseLessonVideoBrief): Promise<{ videoUrl: string; captionUrl?: string }> {
  const submit = await heygenRequest<{ data: { video_id?: string } }>(apiKey, 'POST', '/v3/videos', avatarPayload(brief, false));
  const videoId = submit.data?.video_id;
  if (!videoId) throw new Error('HeyGen submit returned no video_id.');
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);
    const poll = await heygenRequest<{ data: { status?: string; video_url?: string; caption_url?: string; failure_message?: string } }>(
      apiKey, 'GET', `/v3/videos/${encodeURIComponent(videoId)}`
    );
    const status = poll.data?.status;
    if (status === 'completed' && poll.data.video_url) return { videoUrl: poll.data.video_url, captionUrl: poll.data.caption_url };
    if (status === 'failed') throw new Error(`HeyGen render failed: ${poll.data.failure_message ?? 'unknown'}`);
  }
  throw new Error(`HeyGen render timed out (video_id ${videoId}).`);
}

async function confirmSpend(count: number): Promise<boolean> {
  console.log(`\nAbout to render ${count} course-intro video(s) with HeyGen and upload to Cloudinary.`);
  console.log('This spends real HeyGen credits. Re-runs skip already-done courses.');
  if (hasFlag('yes')) return true;
  if (!process.stdin.isTTY) { console.error('Non-interactive shell: pass --yes to confirm the spend. Aborting.'); return false; }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Proceed? type "yes": ')).trim().toLowerCase();
  rl.close();
  return answer === 'yes';
}

async function main(): Promise<void> {
  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');
  const onlySlug = argValue('slug');
  const limit = argValue('limit') ? Number(argValue('limit')) : Infinity;

  const briefs = await loadBriefs();
  const results = await loadResults();

  let queue = briefs.filter((b) => (onlySlug ? b.courseSlug === onlySlug : true));
  const incomplete = queue.filter((b) => !isVideoBriefComplete(b));
  if (incomplete.length) console.warn(`⚠ ${incomplete.length} brief(s) have no script yet: ${incomplete.map((b) => b.courseSlug).join(', ')}`);
  queue = queue.filter(isVideoBriefComplete);
  if (!force) queue = queue.filter((b) => !results.results[b.courseSlug]);
  if (queue.length > limit) queue = queue.slice(0, limit);

  if (queue.length === 0) { console.log('Nothing to render (all done/incomplete or filtered).'); return; }

  if (dryRun) {
    console.log(`[dry-run] ${queue.length} course-intro video(s) would render. No API, no spend.\n`);
    for (const b of queue) {
      const p = avatarPayload(b, true);
      console.log(`— ${b.courseSlug}  (${b.script.trim().split(/\s+/).length} words, ~${b.durationSeconds}s)`);
      console.log(`   avatar=${p.avatar_id} voice=${p.voice_id ?? '<HEYGEN_VOICE_ID-unset>'} ${p.resolution} ${p.aspect_ratio} bg=${p.background.value} captions=${b.captions}`);
    }
    console.log(`\nWhen secrets are set: rerun with --generate. Then: npx tsx scripts/apply-intro-video-urls.ts`);
    return;
  }

  if (queue.length > HARD_CAP) throw new Error(`Refusing to render ${queue.length} (> HARD_CAP ${HARD_CAP}). Use --limit or raise INTRO_VIDEO_MAX_GENERATIONS.`);
  const apiKey = process.env.HEYGEN_API_KEY?.trim();
  if (!apiKey) throw new Error('HEYGEN_API_KEY is required for --generate.');
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).');
  if (!(await confirmSpend(queue.length))) return;

  let ok = 0;
  for (const b of queue) {
    try {
      console.log(`\n▶ ${b.courseSlug} …`);
      const { videoUrl, captionUrl } = await renderVideo(apiKey, b);
      const buffer = await downloadBuffer(videoUrl);
      const uploaded = await uploadVideoToCloudinary(buffer, VIDEO_FOLDER);
      results.results[b.courseSlug] = { url: uploaded.url, captionsUrl: captionUrl };
      await writeResults(results);
      ok += 1;
      console.log(`  ✓ ${results.results[b.courseSlug].url}`);
    } catch (err) {
      console.error(`  ✗ ${b.courseSlug}: ${(err as Error).message}`);
    }
  }
  console.log(`\nRendered ${ok}/${queue.length}. Results → ${RESULTS_PATH}`);
  console.log('Next: npx tsx scripts/apply-intro-video-urls.ts   (writes introVideoUrl into the catalog)');
}

main().catch((err) => { console.error(err); process.exit(1); });
