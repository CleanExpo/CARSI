/**
 * Course lesson-video generator — deterministic half of the lesson-video tool.
 *
 * Claude authors one brief per lesson in `data/video/course-lesson-video-briefs.json` (the part
 * that needs to understand the lesson and the en-AU tone). This script does the mechanical,
 * cost-bearing work: build an SRT caption track, render an avatar video via HeyGen, upload the MP4
 * to Cloudinary, and write the resulting video URL (+ captions) into the lesson's `resources` JSON.
 * Mirrors `scripts/generate-course-voiceover.ts` and reuses the HeyGen request shape from
 * `scripts/automate-brand-videos.ts`.
 *
 * Phases:
 *   --plan      Scaffold/merge a briefs skeleton (one entry per TEXT lesson; quiz lessons skipped).
 *   --generate  The real run: for each lesson with a COMPLETE brief, render → upload → persist.
 *               Idempotent (skips lessons already `done` in the results manifest).
 *
 * Modifiers:
 *   --dry-run              With --generate: print the HeyGen request(s) + SRT preview; no API/spend.
 *   --slug=<slug>          Restrict to one course's lessons.
 *   --limit=N              Cap how many lessons are rendered this run.
 *   --force                Re-scaffold authored briefs / re-render done lessons.
 *   --yes                  Skip the interactive spend confirmation (for non-interactive runs).
 *
 * Run via: `npm run video:lessons:plan` / `npm run video:lessons:generate -- --slug=… --dry-run`.
 * Authoring tool: run MANUALLY with HEYGEN_API_KEY + Cloudinary set, never in CI or app runtime.
 */
import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isCloudinaryConfigured, uploadVideoToCloudinary } from '../src/lib/server/cloudinary-upload';
import {
  COURSES_CATALOG_VERSION,
  isCoursesCatalogFile,
  type CoursesCatalogFile,
} from '../src/lib/seed/courses-catalog-types';
import {
  VIDEO_BRIEFS_VERSION,
  isVideoBriefComplete,
  isVideoBriefsFile,
  type CourseLessonVideoBrief,
  type LessonVideoResource,
  type VideoBriefsFile,
} from '../src/lib/video/course-lesson-video-briefs-types';
import { buildSrt, mergeVideoResource } from '../src/lib/video/lesson-video-helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');
const BRIEFS_PATH = join(__dirname, '..', 'data', 'video', 'course-lesson-video-briefs.json');
const RESULTS_PATH = join(__dirname, '..', 'data', 'video', 'course-lesson-video-results.json');
const SRT_DIR = join(__dirname, '..', 'output', 'course-video', 'captions');

const HEYGEN_BASE_URL = 'https://api.heygen.com';
const HARD_CAP = Number(process.env.LESSON_VIDEO_MAX_GENERATIONS ?? 50);
const POLL_INTERVAL_MS = Number(process.env.LESSON_VIDEO_POLL_INTERVAL_MS ?? 5000);
const POLL_MAX_ATTEMPTS = Number(process.env.LESSON_VIDEO_POLL_MAX_ATTEMPTS ?? 120); // ~10 min/video
const VIDEO_FOLDER = process.env.LESSON_VIDEO_CLOUDINARY_FOLDER ?? 'carsi/course-video';
const VIDEO_RESOURCE_LABEL = 'Lesson video';

// ---------------------------------------------------------------------------
// CLI helpers (same shape as scripts/generate-course-voiceover.ts)
// ---------------------------------------------------------------------------

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function briefKey(courseSlug: string, lessonId: string): string {
  return `${courseSlug}::${lessonId}`;
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

async function readCatalog(): Promise<CoursesCatalogFile> {
  const parsed: unknown = JSON.parse(await readFile(CATALOG_PATH, 'utf8'));
  if (!isCoursesCatalogFile(parsed)) throw new Error(`Invalid courses catalogue at ${CATALOG_PATH}.`);
  return parsed;
}

type LessonRef = {
  courseSlug: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
};

/** Text lessons only — quiz lessons (knowledge checks) do not get a video. */
function listTextLessons(catalog: CoursesCatalogFile, onlySlug?: string): LessonRef[] {
  const refs: LessonRef[] = [];
  for (const course of catalog.courses) {
    if (onlySlug && course.slug !== onlySlug) continue;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (lesson.contentType === 'quiz') continue;
        refs.push({
          courseSlug: course.slug,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          moduleTitle: mod.title,
        });
      }
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Briefs file
// ---------------------------------------------------------------------------

function emptyBrief(ref: LessonRef): CourseLessonVideoBrief {
  return {
    courseSlug: ref.courseSlug,
    lessonId: ref.lessonId,
    lessonTitle: ref.lessonTitle,
    moduleTitle: ref.moduleTitle,
    title: ref.lessonTitle.slice(0, 60),
    script: '',
    format: 'lesson-intro',
    durationSeconds: 60,
    avatarId: null,
    voiceId: null,
    locale: process.env.HEYGEN_LOCALE?.trim() || 'en-AU',
    captions: true,
    visualDirection: '',
    authorNote: '',
  };
}

async function loadBriefs(): Promise<VideoBriefsFile | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(BRIEFS_PATH, 'utf8'));
    if (!isVideoBriefsFile(parsed)) throw new Error(`Invalid briefs file at ${BRIEFS_PATH}.`);
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function scaffold(timestamp: string, force: boolean): Promise<void> {
  const onlySlug = argValue('slug');
  const catalog = await readCatalog();
  const refs = listTextLessons(catalog, onlySlug);
  if (onlySlug && refs.length === 0) {
    throw new Error(`No text lessons for --slug=${onlySlug} (course missing or all-quiz).`);
  }

  const existing = await loadBriefs();
  const merged = new Map(
    (existing?.briefs ?? []).map((b) => [briefKey(b.courseSlug, b.lessonId), b])
  );
  for (const ref of refs) {
    const key = briefKey(ref.courseSlug, ref.lessonId);
    const prior = merged.get(key);
    merged.set(
      key,
      prior && !force
        ? { ...prior, lessonTitle: ref.lessonTitle, moduleTitle: ref.moduleTitle }
        : emptyBrief(ref)
    );
  }

  const briefs = [...merged.values()];
  const out: VideoBriefsFile = {
    version: VIDEO_BRIEFS_VERSION,
    generatedAt: timestamp,
    defaultLanguage: process.env.HEYGEN_LOCALE?.trim() || 'en-AU',
    briefs,
  };
  await writeJson(BRIEFS_PATH, out);
  const authored = briefs.filter(isVideoBriefComplete).length;
  console.log(`Scaffolded ${briefs.length} brief(s) → ${BRIEFS_PATH}`);
  console.log(`  ${authored} authored, ${briefs.length - authored} awaiting a script.`);
}

// ---------------------------------------------------------------------------
// HeyGen render (submit → poll → download), reusing the v3 shapes from automate-brand-videos.ts
// ---------------------------------------------------------------------------

async function heygenRequest<T>(
  apiKey: string,
  method: 'GET' | 'POST',
  route: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${HEYGEN_BASE_URL}${route}`, {
    method,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HeyGen ${method} ${route} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function avatarPayload(brief: CourseLessonVideoBrief) {
  const avatarId = brief.avatarId?.trim() || process.env.HEYGEN_AVATAR_ID?.trim();
  if (!avatarId) throw new Error('HEYGEN_AVATAR_ID is required (or set brief.avatarId).');
  return {
    type: 'avatar',
    avatar_id: avatarId,
    title: `CARSI - ${brief.title}`,
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

type HeyGenResult = { videoUrl: string; captionUrl?: string };

async function renderVideo(apiKey: string, brief: CourseLessonVideoBrief): Promise<HeyGenResult> {
  const submit = await heygenRequest<{ data: { video_id?: string } }>(
    apiKey,
    'POST',
    '/v3/videos',
    avatarPayload(brief)
  );
  const videoId = submit.data?.video_id;
  if (!videoId) throw new Error('HeyGen submit returned no video_id.');

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);
    const poll = await heygenRequest<{
      data: { status?: string; video_url?: string; caption_url?: string; failure_message?: string };
    }>(apiKey, 'GET', `/v3/videos/${encodeURIComponent(videoId)}`);
    const status = poll.data?.status;
    if (status === 'completed' && poll.data.video_url) {
      return { videoUrl: poll.data.video_url, captionUrl: poll.data.caption_url };
    }
    if (status === 'failed') {
      throw new Error(`HeyGen render failed: ${poll.data.failure_message ?? 'unknown'}`);
    }
  }
  throw new Error(`HeyGen render timed out after ${POLL_MAX_ATTEMPTS} polls (video_id ${videoId}).`);
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Results manifest (resumable)
// ---------------------------------------------------------------------------

type ResultItem = {
  key: string;
  courseSlug: string;
  lessonId: string;
  language: string;
  status: 'done' | 'failed';
  url?: string;
  captionsUrl?: string;
  scriptHash?: string;
  generatedAt?: string;
  error?: string;
};
type ResultsFile = { version: 1; items: ResultItem[] };

async function loadResults(): Promise<ResultsFile> {
  try {
    const parsed = JSON.parse(await readFile(RESULTS_PATH, 'utf8')) as ResultsFile;
    if (parsed?.version === 1 && Array.isArray(parsed.items)) return parsed;
  } catch {
    /* empty */
  }
  return { version: 1, items: [] };
}

// ---------------------------------------------------------------------------
// Persistence into lesson resources (idempotent per language) — mergeVideoResource is imported
// from src/lib/video/lesson-video-helpers.ts
// ---------------------------------------------------------------------------

async function persistToSeed(updates: Map<string, LessonVideoResource>): Promise<number> {
  const catalog = await readCatalog();
  let changed = 0;
  for (const course of catalog.courses) {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        const res = updates.get(briefKey(course.slug, lesson.id));
        if (!res) continue;
        lesson.resources = mergeVideoResource(lesson.resources, res);
        changed += 1;
      }
    }
  }
  catalog.version = COURSES_CATALOG_VERSION;
  await writeJson(CATALOG_PATH, catalog);
  return changed;
}

// ---------------------------------------------------------------------------
// Spend confirmation
// ---------------------------------------------------------------------------

async function confirmSpend(count: number): Promise<boolean> {
  console.log(`\nAbout to render ${count} lesson video(s) with HeyGen and upload to Cloudinary.`);
  console.log('This spends real HeyGen credits. Re-runs skip already-done lessons.');
  if (hasFlag('yes')) return true;
  if (!process.stdin.isTTY) {
    console.error('Non-interactive shell: pass --yes to confirm the spend. Aborting.');
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Proceed? type "yes": ')).trim().toLowerCase();
  rl.close();
  return answer === 'yes';
}

// ---------------------------------------------------------------------------
// Generate phase
// ---------------------------------------------------------------------------

async function generate(timestamp: string): Promise<void> {
  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');
  const onlySlug = argValue('slug');
  const limit = argValue('limit') ? Number(argValue('limit')) : Infinity;

  const briefsFile = await loadBriefs();
  if (!briefsFile) throw new Error(`No briefs file at ${BRIEFS_PATH}. Run --plan first, then author.`);
  const results = await loadResults();
  const done = new Set(results.items.filter((i) => i.status === 'done').map((i) => i.key));

  let queue = briefsFile.briefs.filter((b) => (onlySlug ? b.courseSlug === onlySlug : true));
  const incomplete = queue.filter((b) => !isVideoBriefComplete(b));
  if (incomplete.length) {
    console.warn(
      `⚠ ${incomplete.length} brief(s) not authored yet: ${incomplete
        .map((b) => b.lessonTitle || b.lessonId)
        .join(', ')}`
    );
  }
  queue = queue.filter(isVideoBriefComplete);
  if (!force) queue = queue.filter((b) => !done.has(briefKey(b.courseSlug, b.lessonId)));
  if (queue.length > limit) queue = queue.slice(0, limit);

  if (queue.length === 0) {
    console.log('Nothing to render (all briefs done/incomplete or filtered out).');
    return;
  }
  if (queue.length > HARD_CAP) {
    throw new Error(
      `Refusing to render ${queue.length} videos (> HARD_CAP ${HARD_CAP}). Use --limit or raise LESSON_VIDEO_MAX_GENERATIONS.`
    );
  }

  if (dryRun) {
    for (const brief of queue) {
      console.log(`\n── ${brief.courseSlug} / ${brief.lessonTitle} (${brief.locale}) ──`);
      console.log(`avatar: ${brief.avatarId ?? process.env.HEYGEN_AVATAR_ID ?? '(set HEYGEN_AVATAR_ID)'}`);
      console.log(`voice : ${brief.voiceId ?? process.env.HEYGEN_VOICE_ID ?? '(set HEYGEN_VOICE_ID)'}`);
      console.log(`captions: ${brief.captions ? 'srt' : 'none'}  | script (${brief.script.length} chars):`);
      console.log(brief.script);
    }
    console.log(`\n[dry-run] ${queue.length} render request(s) shown. No API calls, no spend.`);
    return;
  }

  const apiKey = process.env.HEYGEN_API_KEY?.trim();
  if (!apiKey) throw new Error('HEYGEN_API_KEY is not set (required to render videos).');
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).');
  }
  if (!(await confirmSpend(queue.length))) return;

  const seedUpdates = new Map<string, LessonVideoResource>();
  const upsert = (item: ResultItem) => {
    const idx = results.items.findIndex((i) => i.key === item.key && i.language === item.language);
    if (idx >= 0) results.items[idx] = item;
    else results.items.push(item);
  };

  let ok = 0;
  for (const brief of queue) {
    const key = briefKey(brief.courseSlug, brief.lessonId);
    try {
      // Persist the locally-built SRT for the team / future subtitle tracks.
      await mkdir(SRT_DIR, { recursive: true });
      await writeFile(join(SRT_DIR, `${brief.lessonId}.${brief.locale}.srt`), buildSrt(brief.script));

      const scriptHash = createHash('sha256').update(brief.script.trim()).digest('hex').slice(0, 12);
      const { videoUrl, captionUrl } = await renderVideo(apiKey, brief);
      const buffer = await downloadBuffer(videoUrl);
      const { url } = await uploadVideoToCloudinary(buffer, VIDEO_FOLDER);

      const resource: LessonVideoResource = {
        label: VIDEO_RESOURCE_LABEL,
        url,
        kind: 'video',
        captionsUrl: captionUrl,
        language: brief.locale,
      };
      seedUpdates.set(key, resource);
      upsert({
        key,
        courseSlug: brief.courseSlug,
        lessonId: brief.lessonId,
        language: brief.locale,
        status: 'done',
        url,
        captionsUrl: captionUrl,
        scriptHash,
        generatedAt: timestamp,
      });
      await writeJson(RESULTS_PATH, results);
      ok += 1;
      console.log(`✓ ${brief.courseSlug} / ${brief.lessonTitle} → ${url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      upsert({
        key,
        courseSlug: brief.courseSlug,
        lessonId: brief.lessonId,
        language: brief.locale,
        status: 'failed',
        error: message,
        generatedAt: timestamp,
      });
      await writeJson(RESULTS_PATH, results);
      console.error(`✗ ${brief.courseSlug} / ${brief.lessonTitle}: ${message}`);
    }
  }

  if (seedUpdates.size) {
    const changed = await persistToSeed(seedUpdates);
    console.log(`Updated ${changed} lesson resource list(s) in ${CATALOG_PATH}.`);
    console.log('Next: run `npm run db:seed-courses` to import the new video links into the DB.');
  }
  console.log(`\nDone. ${ok}/${queue.length} rendered.`);
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const timestamp = new Date().toISOString();
  if (hasFlag('plan')) return scaffold(timestamp, hasFlag('force'));
  if (hasFlag('generate')) return generate(timestamp);
  console.log(
    'Usage: tsx scripts/generate-course-lesson-videos.ts (--plan | --generate) [--dry-run] [--slug=<slug>] [--limit=N] [--force] [--yes]'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
