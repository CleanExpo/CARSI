/**
 * Course INTRO-video generator — audio-driven, natural-delivery render.
 *
 * Pipeline (per course, from the authored brief):
 *   1. ElevenLabs TTS in the configured voice  → natural-prosody MP3 (human pauses/tempo)
 *   2. upload MP3 to Cloudinary                 → public audio URL
 *   3. HeyGen POST /v3/videos {type:avatar, avatar_id, audio_url}  → avatar lip-synced to the
 *      real voice; video length FOLLOWS THE AUDIO (no time-boxing, no cut-off sentences)
 *   4. poll → download MP4 → upload to Cloudinary → write results map
 * A separate safe step (`scripts/apply-intro-video-urls.ts`) writes the URLs into the catalog.
 *
 * Verified against docs 2026-07-16: HeyGen /v3/videos `audio_url` (public MP3, mutually exclusive
 * with script) lip-syncs the avatar to uploaded audio; ElevenLabs POST /v1/text-to-speech/{voice}.
 *
 * Phases / modifiers:
 *   --dry-run   Print the per-course plan. NO API, NO spend, NO secrets required.
 *   --generate  Real run: TTS → upload → render → upload → results map. Idempotent (skips done).
 *   --slug=<s>  One course.  --limit=N  Cap.  --force  Re-render done slugs.  --yes  Skip confirm.
 *
 * Run in CI (or manually) with HEYGEN_API_KEY + HEYGEN_AVATAR_ID + ELEVENLABS_API_KEY + CLOUDINARY_*.
 */
import 'dotenv/config';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isCloudinaryConfigured, uploadVideoToCloudinary, uploadCourseAudioToCloudinary } from '../src/lib/server/cloudinary-upload';
import { isVideoBriefComplete, isVideoBriefsFile, type CourseLessonVideoBrief } from '../src/lib/video/course-lesson-video-briefs-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIEFS_PATH = join(__dirname, '..', 'data', 'video', 'course-intro-video-briefs.json');
const RESULTS_PATH = join(__dirname, '..', 'data', 'video', 'course-intro-video-results.json');

const HEYGEN_BASE_URL = 'https://api.heygen.com';
const ELEVEN_BASE_URL = 'https://api.elevenlabs.io';
const HARD_CAP = Number(process.env.INTRO_VIDEO_MAX_GENERATIONS ?? 40);
const POLL_INTERVAL_MS = Number(process.env.LESSON_VIDEO_POLL_INTERVAL_MS ?? 5000);
const POLL_MAX_ATTEMPTS = Number(process.env.LESSON_VIDEO_POLL_MAX_ATTEMPTS ?? 180); // ~15 min/video
const VIDEO_FOLDER = process.env.INTRO_VIDEO_CLOUDINARY_FOLDER ?? 'carsi/course-intro';
const AUDIO_FOLDER = process.env.INTRO_AUDIO_CLOUDINARY_FOLDER ?? 'carsi/course-intro-audio';
const ELEVEN_MODEL = process.env.INTRO_ELEVENLABS_MODEL ?? 'eleven_multilingual_v2';
const ELEVEN_VOICE_FALLBACK = process.env.INTRO_ELEVENLABS_VOICE_ID ?? '';

const argValue = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const hasFlag = (n: string) => process.argv.includes(`--${n}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ResultsMap = { version: 1; results: Record<string, { url: string; captionsUrl?: string }> };

const voiceFor = (b: CourseLessonVideoBrief) => b.voiceId?.trim() || ELEVEN_VOICE_FALLBACK;
const avatarFor = (b: CourseLessonVideoBrief) => b.avatarId?.trim() || process.env.HEYGEN_AVATAR_ID?.trim() || '';

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

/** ElevenLabs text-to-speech → MP3 buffer (natural prosody; length follows the words). */
async function elevenTts(script: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is required.');
  const res = await fetch(`${ELEVEN_BASE_URL}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: script.trim(),
      model_id: ELEVEN_MODEL,
      voice_settings: {
        stability: Number(process.env.INTRO_VOICE_STABILITY ?? '0.5'),
        similarity_boost: Number(process.env.INTRO_VOICE_SIMILARITY ?? '0.75'),
        style: Number(process.env.INTRO_VOICE_STYLE ?? '0'),
        use_speaker_boost: (process.env.INTRO_VOICE_SPEAKER_BOOST ?? 'true') !== 'false',
      },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function heygenRequest<T>(apiKey: string, method: 'GET' | 'POST', route: string, body?: unknown): Promise<T> {
  const res = await fetch(`${HEYGEN_BASE_URL}${route}`, {
    method,
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HeyGen ${method} ${route} failed (${res.status}): ${text.slice(0, 400)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

/**
 * HeyGen avatar video driven by a public audio URL (lip-sync; duration = audio length).
 *
 * Face/expression quality knobs (2026-07-16 — the first render looked flat because BOTH of these
 * silently defaulted):
 *   INTRO_VIDEO_ENGINE       'avatar_v' (highest fidelity, cross-reference animation) | 'avatar_iv'
 *                            (default if HeyGen picks) | 'avatar_iii'. Check the look's
 *                            supported_api_engines before setting.
 *   INTRO_VIDEO_EXPRESSIVENESS  'high' | 'medium' | 'low'. Photo avatars only, Avatar IV only —
 *                            HeyGen defaults it to 'low' when omitted (= dead expression).
 *                            REJECTED by the API when engine is avatar_v.
 *   INTRO_VIDEO_MOTION_PROMPT   natural-language body/gesture direction (photo avatars, either engine).
 */
async function renderAvatarWithAudio(apiKey: string, brief: CourseLessonVideoBrief, audioUrl: string): Promise<{ videoUrl: string; captionUrl?: string }> {
  const engineType = (process.env.INTRO_VIDEO_ENGINE ?? 'avatar_v').trim();
  const expressiveness = (process.env.INTRO_VIDEO_EXPRESSIVENESS ?? 'high').trim();
  const motionPrompt = process.env.INTRO_VIDEO_MOTION_PROMPT?.trim();
  const payload: Record<string, unknown> = {
    type: 'avatar',
    avatar_id: avatarFor(brief),
    title: `CARSI Intro - ${brief.title}`,
    audio_url: audioUrl, // mutually exclusive with script — drives natural lip-sync
    resolution: process.env.LESSON_VIDEO_RESOLUTION ?? '1080p',
    aspect_ratio: process.env.LESSON_VIDEO_ASPECT_RATIO ?? '16:9',
    background: { type: 'color', value: process.env.LESSON_VIDEO_BACKGROUND ?? '#060a14' },
    caption: brief.captions ? { file_format: 'srt' } : undefined,
    output_format: 'mp4',
  };
  if (engineType && engineType !== 'default') payload.engine = { type: engineType };
  // expressiveness is Avatar IV only — the API rejects it alongside avatar_v
  if (engineType !== 'avatar_v' && expressiveness) payload.expressiveness = expressiveness;
  if (motionPrompt) payload.motion_prompt = motionPrompt;
  const submit = await heygenRequest<{ data: { video_id?: string } }>(apiKey, 'POST', '/v3/videos', payload);
  const videoId = submit.data?.video_id;
  if (!videoId) throw new Error('HeyGen submit returned no video_id.');
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);
    const poll = await heygenRequest<{ data: { status?: string; video_url?: string; caption_url?: string; subtitle_url?: string; error?: unknown } }>(
      apiKey, 'GET', `/v3/videos/${encodeURIComponent(videoId)}`
    );
    const status = poll.data?.status;
    if (status === 'completed' && poll.data.video_url) return { videoUrl: poll.data.video_url, captionUrl: poll.data.caption_url ?? poll.data.subtitle_url };
    if (status === 'failed') throw new Error(`HeyGen render failed: ${JSON.stringify(poll.data.error ?? 'unknown')}`);
  }
  throw new Error(`HeyGen render timed out (video_id ${videoId}).`);
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function confirmSpend(count: number): Promise<boolean> {
  console.log(`\nAbout to render ${count} course-intro video(s): ElevenLabs voice + HeyGen avatar, uploaded to Cloudinary.`);
  console.log('This spends real ElevenLabs + HeyGen credits. Re-runs skip already-done courses.');
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

  let queue = briefs.filter((b) => (onlySlug ? b.courseSlug === onlySlug : true)).filter(isVideoBriefComplete);
  if (!force) queue = queue.filter((b) => !results.results[b.courseSlug]);
  if (queue.length > limit) queue = queue.slice(0, limit);

  if (queue.length === 0) { console.log('Nothing to render (all done/incomplete or filtered).'); return; }

  if (dryRun) {
    console.log(`[dry-run] ${queue.length} course-intro video(s). ElevenLabs → Cloudinary → HeyGen. No API, no spend.\n`);
    for (const b of queue) {
      const eng = (process.env.INTRO_VIDEO_ENGINE ?? 'avatar_v').trim();
      console.log(`— ${b.courseSlug}  (${b.script.trim().split(/\s+/).length} words)`);
      console.log(`   voice=${voiceFor(b) || '<INTRO_ELEVENLABS_VOICE_ID / brief.voiceId unset>'}  avatar=${avatarFor(b) || '<HEYGEN_AVATAR_ID unset>'}  model=${ELEVEN_MODEL}  captions=${b.captions}`);
      console.log(`   engine=${eng}${eng !== 'avatar_v' ? `  expressiveness=${process.env.INTRO_VIDEO_EXPRESSIVENESS ?? 'high'}` : ''}${process.env.INTRO_VIDEO_MOTION_PROMPT ? '  motion_prompt=set' : ''}`);
    }
    console.log(`\nWhen secrets are set: rerun with --generate. Then: npx tsx scripts/apply-intro-video-urls.ts`);
    return;
  }

  if (queue.length > HARD_CAP) throw new Error(`Refusing to render ${queue.length} (> HARD_CAP ${HARD_CAP}). Use --limit or raise INTRO_VIDEO_MAX_GENERATIONS.`);
  const heygenKey = process.env.HEYGEN_API_KEY?.trim();
  if (!heygenKey) throw new Error('HEYGEN_API_KEY is required for --generate.');
  if (!process.env.ELEVENLABS_API_KEY?.trim()) throw new Error('ELEVENLABS_API_KEY is required for --generate.');
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).');
  for (const b of queue) {
    if (!voiceFor(b)) throw new Error(`No ElevenLabs voice for ${b.courseSlug} (set brief.voiceId or INTRO_ELEVENLABS_VOICE_ID).`);
    if (!avatarFor(b)) throw new Error(`No HeyGen avatar for ${b.courseSlug} (set brief.avatarId or HEYGEN_AVATAR_ID).`);
  }
  if (!(await confirmSpend(queue.length))) return;

  let ok = 0;
  for (const b of queue) {
    try {
      console.log(`\n▶ ${b.courseSlug} …`);
      const mp3 = await elevenTts(b.script, voiceFor(b));
      const audio = await uploadCourseAudioToCloudinary(mp3, AUDIO_FOLDER);
      console.log(`  · voice audio ${Math.round(mp3.length / 1024)} KB → ${audio.url}`);
      const { videoUrl, captionUrl } = await renderAvatarWithAudio(heygenKey, b, audio.url);
      const videoBuf = await downloadBuffer(videoUrl);
      const uploaded = await uploadVideoToCloudinary(videoBuf, VIDEO_FOLDER);
      results.results[b.courseSlug] = { url: uploaded.url, captionsUrl: captionUrl };
      await writeResults(results);
      ok += 1;
      console.log(`  ✓ ${uploaded.url}`);
    } catch (err) {
      console.error(`  ✗ ${b.courseSlug}: ${(err as Error).message}`);
    }
  }
  console.log(`\nRendered ${ok}/${queue.length}. Results → ${RESULTS_PATH}`);
  console.log('Next: npx tsx scripts/apply-intro-video-urls.ts   (writes introVideoUrl into the catalog)');
}

main().catch((err) => { console.error(err); process.exit(1); });
