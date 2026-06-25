/**
 * Course voice-narration generator — deterministic half of the `course-voiceover` skill.
 *
 * Claude authors one narration brief per lesson in `data/voice/course-voice-briefs.json` (the
 * part that needs to understand the lesson and the en-AU tone). This script does the
 * mechanical, cost-bearing work: call the ElevenLabs text-to-speech REST API for each brief,
 * upload the MP3 to Cloudinary, and write the resulting audio URL into the lesson's `resources`
 * JSON in the course catalogue. Mirrors `scripts/generate-course-thumbnails.ts`.
 *
 * Phases:
 *   --plan      Scaffold/merge a briefs skeleton (one entry per lesson; empty script).
 *               Never overwrites an authored brief unless --force.
 *   --generate  The real run: for each lesson with a COMPLETE brief, synthesise → upload →
 *               persist. Idempotent (skips lessons already `done` in the results manifest).
 *
 * Modifiers:
 *   --dry-run              With --generate: print the assembled TTS request(s); no API/Cloudinary/DB.
 *   --slug=<slug>          Restrict to one course's lessons.
 *   --limit=N              Cap how many lessons are generated this run.
 *   --force                Re-scaffold authored briefs (--plan) / re-generate done lessons (--generate).
 *   --persist=seed|db|both Where the new audio URL is written (default: seed).
 *   --yes                  Skip the interactive spend confirmation (for non-interactive runs).
 *
 * Run via: `npm run voice:plan` / `npm run voice:generate -- --slug=… --dry-run`.
 * This is an authoring tool: run manually, never in CI or the app runtime (it spends money).
 */
import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isCloudinaryConfigured,
  uploadCourseAudioToCloudinary,
} from '../src/lib/server/cloudinary-upload';
import {
  COURSES_CATALOG_VERSION,
  isCoursesCatalogFile,
  type CoursesCatalogFile,
} from '../src/lib/seed/courses-catalog-types';
import {
  VOICE_BRIEFS_VERSION,
  isVoiceBriefComplete,
  isVoiceBriefsFile,
  type CourseVoiceBrief,
  type LessonAudioResource,
  type VoiceBriefsFile,
} from '../src/lib/voice/course-voice-briefs-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');
const BRIEFS_PATH = join(__dirname, '..', 'data', 'voice', 'course-voice-briefs.json');
const RESULTS_PATH = join(__dirname, '..', 'data', 'voice', 'course-voice-results.json');

const ELEVENLABS_TTS_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2';
const HARD_CAP = Number(process.env.VOICE_MAX_GENERATIONS ?? 50);
const AUDIO_RESOURCE_LABEL = 'Lesson narration (audio)';

// Calm-professional defaults for the en-AU training tone (used when a brief leaves them null).
const DEFAULT_STABILITY = 0.5;
const DEFAULT_SIMILARITY = 0.75;
const DEFAULT_STYLE = 0.15;

// Prisma is loaded lazily: --plan, --dry-run and the default seed-JSON persistence need no DB,
// and the generated client may be absent in environments that only author/preview briefs.
type PrismaClient = (typeof import('../src/lib/prisma'))['prisma'];
let prismaInstance: PrismaClient | null = null;
async function getPrisma(): Promise<PrismaClient> {
  if (!prismaInstance) prismaInstance = (await import('../src/lib/prisma')).prisma;
  return prismaInstance;
}

// ---------------------------------------------------------------------------
// CLI helpers (same shape as scripts/generate-course-thumbnails.ts)
// ---------------------------------------------------------------------------

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

type PersistMode = 'seed' | 'db' | 'both';

function briefKey(courseSlug: string, lessonId: string): string {
  return `${courseSlug}::${lessonId}`;
}

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

async function readCatalog(): Promise<CoursesCatalogFile> {
  const raw = await readFile(CATALOG_PATH, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isCoursesCatalogFile(parsed)) {
    throw new Error(`Invalid courses catalogue at ${CATALOG_PATH}.`);
  }
  return parsed;
}

type LessonRef = { courseSlug: string; lessonId: string; lessonTitle: string };

function listLessons(catalog: CoursesCatalogFile, onlySlug?: string): LessonRef[] {
  const refs: LessonRef[] = [];
  for (const course of catalog.courses) {
    if (onlySlug && course.slug !== onlySlug) continue;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        refs.push({ courseSlug: course.slug, lessonId: lesson.id, lessonTitle: lesson.title });
      }
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Briefs file
// ---------------------------------------------------------------------------

function emptyBrief(ref: LessonRef): CourseVoiceBrief {
  return {
    courseSlug: ref.courseSlug,
    lessonId: ref.lessonId,
    lessonTitle: ref.lessonTitle,
    script: '',
    voiceId: null,
    modelId: null,
    stability: null,
    similarityBoost: null,
    style: null,
    locale: process.env.ELEVENLABS_LOCALE?.trim() || 'en-AU',
    authorNote: '',
  };
}

async function loadBriefs(): Promise<VoiceBriefsFile | null> {
  try {
    const raw = await readFile(BRIEFS_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isVoiceBriefsFile(parsed)) {
      throw new Error(`Invalid briefs file at ${BRIEFS_PATH}.`);
    }
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
  const refs = listLessons(catalog, onlySlug);
  if (onlySlug && refs.length === 0) {
    throw new Error(`No course found for --slug=${onlySlug} (or it has no lessons).`);
  }

  const existing = await loadBriefs();
  const byKey = new Map(
    (existing?.briefs ?? []).map((b) => [briefKey(b.courseSlug, b.lessonId), b])
  );

  // Keep every authored brief (even for courses outside --slug); merge in the scoped lessons.
  const merged = new Map(byKey);
  for (const ref of refs) {
    const key = briefKey(ref.courseSlug, ref.lessonId);
    const prior = merged.get(key);
    if (prior && !force) {
      merged.set(key, { ...prior, lessonTitle: ref.lessonTitle });
    } else {
      merged.set(key, emptyBrief(ref));
    }
  }

  const briefs = [...merged.values()];
  const out: VoiceBriefsFile = {
    version: VOICE_BRIEFS_VERSION,
    generatedAt: timestamp,
    briefs,
  };
  await writeJson(BRIEFS_PATH, out);

  const authored = briefs.filter(isVoiceBriefComplete).length;
  console.log(`Scaffolded ${briefs.length} brief(s) → ${BRIEFS_PATH}`);
  console.log(`  ${authored} already authored, ${briefs.length - authored} awaiting the skill.`);
}

// ---------------------------------------------------------------------------
// Request assembly + ElevenLabs synthesis
// ---------------------------------------------------------------------------

type TtsRequest = {
  voiceId: string;
  modelId: string;
  text: string;
  voiceSettings: { stability: number; similarity_boost: number; style: number };
};

function buildRequest(brief: CourseVoiceBrief): TtsRequest {
  const voiceId = brief.voiceId?.trim() || process.env.ELEVENLABS_VOICE_ID?.trim() || '';
  return {
    voiceId,
    modelId: brief.modelId?.trim() || DEFAULT_MODEL,
    text: brief.script.trim(),
    voiceSettings: {
      stability: brief.stability ?? DEFAULT_STABILITY,
      similarity_boost: brief.similarityBoost ?? DEFAULT_SIMILARITY,
      style: brief.style ?? DEFAULT_STYLE,
    },
  };
}

async function synthesize(apiKey: string, req: TtsRequest): Promise<Buffer> {
  const res = await fetch(`${ELEVENLABS_TTS_BASE}/${encodeURIComponent(req.voiceId)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: req.text,
      model_id: req.modelId,
      voice_settings: req.voiceSettings,
    }),
  });
  if (!res.ok) {
    // ElevenLabs returns JSON errors; surface the body but never throw raw secrets.
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs TTS API ${res.status}: ${detail.slice(0, 400) || 'unknown error'}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) throw new Error('ElevenLabs TTS API returned an empty audio body.');
  return buffer;
}

// ---------------------------------------------------------------------------
// Results manifest (resumable; written after every lesson)
// ---------------------------------------------------------------------------

type ResultItem = {
  key: string;
  courseSlug: string;
  lessonId: string;
  status: 'done' | 'failed';
  url?: string;
  publicId?: string;
  scriptHash?: string;
  generatedAt?: string;
  error?: string;
};
type ResultsFile = { version: 1; items: ResultItem[] };

async function loadResults(): Promise<ResultsFile> {
  try {
    const raw = await readFile(RESULTS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as ResultsFile;
    if (parsed?.version === 1 && Array.isArray(parsed.items)) return parsed;
  } catch {
    /* fall through to empty */
  }
  return { version: 1, items: [] };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Merge an audio resource into a lesson's `resources`, replacing any prior audio entry. */
function mergeAudioResource(existing: unknown, url: string): LessonAudioResource[] {
  const audio: LessonAudioResource = { label: AUDIO_RESOURCE_LABEL, url, kind: 'audio' };
  const base = Array.isArray(existing)
    ? (existing as unknown[]).filter((r) => {
        if (typeof r !== 'object' || r === null) return true;
        return (r as Record<string, unknown>).kind !== 'audio';
      })
    : [];
  return [...(base as LessonAudioResource[]), audio];
}

async function persistToSeed(updates: Map<string, string>): Promise<number> {
  const catalog = await readCatalog();
  let changed = 0;
  for (const course of catalog.courses) {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        const url = updates.get(briefKey(course.slug, lesson.id));
        if (!url) continue;
        lesson.resources = mergeAudioResource(lesson.resources, url);
        changed += 1;
      }
    }
  }
  // Keep the catalogue contract intact for the next `npm run db:seed-courses`.
  catalog.version = COURSES_CATALOG_VERSION;
  await writeJson(CATALOG_PATH, catalog);
  return changed;
}

async function persistToDb(lessonId: string, url: string): Promise<void> {
  const prisma = await getPrisma();
  const lesson = await prisma.lmsLesson.findUnique({
    where: { id: lessonId },
    select: { resources: true },
  });
  if (!lesson) throw new Error(`No LmsLesson row for id ${lessonId} (run db:seed-courses first?).`);
  await prisma.lmsLesson.update({
    where: { id: lessonId },
    data: { resources: mergeAudioResource(lesson.resources, url) },
  });
}

// ---------------------------------------------------------------------------
// Spend confirmation
// ---------------------------------------------------------------------------

async function confirmSpend(count: number): Promise<boolean> {
  console.log(
    `\nAbout to synthesise ${count} narration(s) with ElevenLabs and upload to Cloudinary.`
  );
  console.log('This spends real ElevenLabs credits. Re-runs skip already-done lessons.');
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
  const persist = (argValue('persist') as PersistMode | undefined) ?? 'seed';
  if (!['seed', 'db', 'both'].includes(persist)) {
    throw new Error(`--persist must be seed|db|both (got "${persist}").`);
  }

  const briefsFile = await loadBriefs();
  if (!briefsFile) {
    throw new Error(`No briefs file at ${BRIEFS_PATH}. Run with --plan first, then author briefs.`);
  }
  const results = await loadResults();
  const done = new Set(results.items.filter((i) => i.status === 'done').map((i) => i.key));

  let queue = briefsFile.briefs.filter((b) => (onlySlug ? b.courseSlug === onlySlug : true));
  if (onlySlug && queue.length === 0) {
    throw new Error(`No briefs found for --slug=${onlySlug}.`);
  }

  const incomplete = queue.filter((b) => !isVoiceBriefComplete(b));
  if (incomplete.length) {
    console.warn(
      `⚠ ${incomplete.length} brief(s) not authored yet (run the course-voiceover skill): ${incomplete
        .map((b) => b.lessonTitle || b.lessonId)
        .join(', ')}`
    );
  }
  queue = queue.filter(isVoiceBriefComplete);
  if (!force) queue = queue.filter((b) => !done.has(briefKey(b.courseSlug, b.lessonId)));
  if (queue.length > limit) queue = queue.slice(0, limit);

  if (queue.length === 0) {
    console.log('Nothing to generate (all briefs done/incomplete or filtered out).');
    return;
  }
  if (queue.length > HARD_CAP) {
    throw new Error(
      `Refusing to synthesise ${queue.length} narrations (> HARD_CAP ${HARD_CAP}). Use --limit or raise VOICE_MAX_GENERATIONS.`
    );
  }

  if (dryRun) {
    for (const brief of queue) {
      const req = buildRequest(brief);
      console.log(`\n── ${brief.courseSlug} / ${brief.lessonTitle || brief.lessonId} ──`);
      console.log(`voice: ${req.voiceId || '(missing — set ELEVENLABS_VOICE_ID or brief.voiceId)'}`);
      console.log(`model: ${req.modelId}  settings: ${JSON.stringify(req.voiceSettings)}`);
      console.log(`text (${req.text.length} chars): ${req.text}`);
    }
    console.log(`\n[dry-run] ${queue.length} request(s) shown. No API calls, no spend.`);
    return;
  }

  // Real run: preflight config, then confirm spend.
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set (required for voice synthesis).');
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).'
    );
  }
  for (const brief of queue) {
    if (!buildRequest(brief).voiceId) {
      throw new Error(
        `Brief for "${brief.lessonTitle || brief.lessonId}" has no voiceId and ELEVENLABS_VOICE_ID is unset.`
      );
    }
  }
  if (persist !== 'seed' && !process.env.DATABASE_URL?.trim()) {
    throw new Error(`--persist=${persist} requires DATABASE_URL.`);
  }
  if (!(await confirmSpend(queue.length))) return;

  const seedUpdates = new Map<string, string>();
  const upsertResult = (item: ResultItem) => {
    const idx = results.items.findIndex((i) => i.key === item.key);
    if (idx >= 0) results.items[idx] = item;
    else results.items.push(item);
  };

  let ok = 0;
  for (const brief of queue) {
    const key = briefKey(brief.courseSlug, brief.lessonId);
    try {
      const req = buildRequest(brief);
      const scriptHash = createHash('sha256').update(req.text).digest('hex').slice(0, 12);
      const buffer = await synthesize(apiKey, req);
      const { url, publicId } = await uploadCourseAudioToCloudinary(buffer);

      if (persist === 'db' || persist === 'both') await persistToDb(brief.lessonId, url);
      if (persist === 'seed' || persist === 'both') seedUpdates.set(key, url);

      upsertResult({
        key,
        courseSlug: brief.courseSlug,
        lessonId: brief.lessonId,
        status: 'done',
        url,
        publicId,
        scriptHash,
        generatedAt: timestamp,
      });
      await writeJson(RESULTS_PATH, results); // write-after-each (resumable)
      ok += 1;
      console.log(`✓ ${brief.courseSlug} / ${brief.lessonTitle || brief.lessonId} → ${url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      upsertResult({
        key,
        courseSlug: brief.courseSlug,
        lessonId: brief.lessonId,
        status: 'failed',
        error: message,
        generatedAt: timestamp,
      });
      await writeJson(RESULTS_PATH, results);
      console.error(`✗ ${brief.courseSlug} / ${brief.lessonTitle || brief.lessonId}: ${message}`);
    }
  }

  if (seedUpdates.size) {
    const changed = await persistToSeed(seedUpdates);
    console.log(`Updated ${changed} lesson resource list(s) in ${CATALOG_PATH}.`);
    console.log('Next: run `npm run db:seed-courses` to import the new audio links into the DB.');
  }
  console.log(`\nDone. ${ok}/${queue.length} narrated.`);
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const timestamp = new Date().toISOString();
  if (hasFlag('plan')) {
    await scaffold(timestamp, hasFlag('force'));
    return;
  }
  if (hasFlag('generate')) {
    await generate(timestamp);
    return;
  }
  console.log(
    'Usage: tsx scripts/generate-course-voiceover.ts (--plan | --generate) [--dry-run] [--slug=<slug>] [--limit=N] [--force] [--persist=seed|db|both] [--yes]'
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    if (prismaInstance) await prismaInstance.$disconnect();
  });
