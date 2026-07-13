/**
 * Course thumbnail generator — deterministic half of the `course-thumbnails` skill.
 *
 * Claude authors one creative brief per course in
 * `data/thumbnails/course-thumbnail-briefs.json` (the part that needs to understand the
 * course). This script does the mechanical, cost-bearing work: build a prompt from each
 * brief, call OpenAI `gpt-image-1` for a TEXT-FREE background, upload to Cloudinary, and
 * write the URL into the course catalogue.
 *
 * Phases:
 *   --plan      Scaffold/merge a briefs skeleton (one entry per course; discipline guessed).
 *               Never overwrites an authored brief unless --force.
 *   --generate  The real run: for each course with a COMPLETE brief, generate → upload →
 *               persist. Idempotent (skips slugs already `done` in the results manifest).
 *
 * Modifiers:
 *   --dry-run             With --generate: print the assembled prompt(s); no API/Cloudinary/DB.
 *   --slug=<slug>         Restrict to one course.
 *   --limit=N             Cap how many courses are generated this run.
 *   --force               Re-scaffold authored briefs (--plan) / re-generate done slugs (--generate).
 *   --from-db             Load courses from the database instead of the seed JSON (default: seed JSON).
 *   --persist=seed|db|both  Where the new URL is written (default: seed).
 *   --yes                 Skip the interactive spend confirmation (for non-interactive runs).
 *
 * Run via: `npm run db:thumbnails:plan` / `npm run db:thumbnails:generate -- --slug=… --dry-run`.
 * This is an authoring tool: run manually, never in CI or the app runtime (it spends money).
 */
import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isCloudinaryConfigured,
  uploadCourseThumbnailToCloudinary,
} from '../src/lib/server/cloudinary-upload';
import {
  THUMBNAIL_BRIEFS_VERSION,
  isBriefComplete,
  isThumbnailBriefsFile,
  type CourseThumbnailBrief,
  type ThumbnailBriefsFile,
} from '../src/lib/thumbnails/course-thumbnail-briefs-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');
const BRIEFS_PATH = join(__dirname, '..', 'data', 'thumbnails', 'course-thumbnail-briefs.json');
const RESULTS_PATH = join(__dirname, '..', 'data', 'thumbnails', 'course-thumbnail-results.json');

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1';
// gpt-image-1 landscape size closest to the app's 16:10 card; the app crops via object-cover.
const IMAGE_SIZE = '1536x1024';
const HARD_CAP = Number(process.env.THUMBNAIL_MAX_GENERATIONS ?? 25);

const DISCIPLINE_CODES = ['WRT', 'CRT', 'ASD', 'OCT', 'CCT', 'FSRT', 'AMRT'] as const;

/** Discipline accent translated to colour WORDS (gpt-image-1 follows prose better than hex). */
const DISCIPLINE_PALETTE_WORDS: Record<string, string> = {
  WRT: 'cool corporate blues and clean water tones (#146fc2 family)',
  CRT: 'fresh teal and soft restorative green tones',
  ASD: 'calm indigo and structural blue-violet tones',
  OCT: 'soft purples and fresh, airy lilac tones',
  CCT: 'bright clean cyan and aqua tones',
  FSRT: 'warm ember orange against deep charcoal',
  AMRT: 'clean clinical greens',
};

// ---------------------------------------------------------------------------
// IICRC CEC Accredited signature (licence-critical, FAIL-CLOSED)
// ---------------------------------------------------------------------------
// A course earns the unified "accredited" thumbnail look ONLY when it appears in
// the CEC approvals registry (data/seed/cec-approvals.json) with status
// 'approved' — the SAME SSOT the compliance guards read
// (scripts/check-iicrc-compliance.mjs). An empty/unreadable registry yields an
// empty set → NO course is styled as accredited. This makes it impossible to
// imply CEC accreditation on a course the IICRC has not approved.
//
// The signature is COLOUR + FINISH only — never a seal, badge, medallion, crest
// or any mark. IICRC logos/marks are prohibited (CARSI/CLAUDE.md), and a generic
// "accreditation seal" could imply one, so the negative prompt below forbids all
// emblem forms and the distinction is carried purely by a shared navy/gold
// palette + finish, giving every accredited course one recognisable look.
const CEC_APPROVALS_PATH = join(__dirname, '..', 'data', 'seed', 'cec-approvals.json');

function loadApprovedCecSlugs(): Set<string> {
  try {
    const parsed = JSON.parse(readFileSync(CEC_APPROVALS_PATH, 'utf8')) as {
      approvals?: Array<{ slug?: unknown; status?: unknown }>;
    };
    if (!Array.isArray(parsed?.approvals)) return new Set();
    return new Set(
      parsed.approvals
        .filter((e) => e && e.status === 'approved' && typeof e.slug === 'string' && e.slug.trim())
        .map((e) => (e.slug as string).trim()),
    );
  } catch {
    return new Set(); // fail-closed: unreadable registry → no accredited styling
  }
}

const CEC_APPROVED_SLUGS: Set<string> = loadApprovedCecSlugs();

const CEC_SIGNATURE = {
  palette:
    'a single unified accreditation signature palette shared by every accredited course: ' +
    'deep authoritative navy and midnight blue, richer and darker than standard course art, ' +
    'lifted by refined brushed-gold and warm amber accents',
  mood: 'prestigious, credentialed, authoritative; a premium continuing-education standard; quietly distinguished',
  finish:
    'Accreditation finish: a consistent premium treatment — a soft warm golden rim-light on the ' +
    'subject and a subtle radial gold glow in the darker upper region — so every accredited ' +
    'course shares the same recognisable distinguished look.',
  // Reinforce the mark ban: no invented seal/badge that could read as an IICRC mark.
  negative: 'no seals, no badges, no medallions, no crests, no emblems, no ribbons, no stamps, no shields',
};

// Prisma is loaded lazily: --plan, --dry-run and the default seed-JSON source need no DB,
// and the generated client may be absent in environments that only author/preview briefs.
type PrismaClient = (typeof import('../src/lib/prisma'))['prisma'];
let prismaInstance: PrismaClient | null = null;
async function getPrisma(): Promise<PrismaClient> {
  if (!prismaInstance) prismaInstance = (await import('../src/lib/prisma')).prisma;
  return prismaInstance;
}

// ---------------------------------------------------------------------------
// CLI helpers (same shape as scripts/automate-brand-videos.ts)
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

// ---------------------------------------------------------------------------
// Course loading
// ---------------------------------------------------------------------------

type CourseLite = {
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  category: string | null;
  iicrcDiscipline: string | null;
  moduleTitles: string[];
};

type CatalogShape = {
  courses: Array<{
    slug: string;
    title: string;
    description: string | null;
    shortDescription: string | null;
    category: string | null;
    iicrcDiscipline: string | null;
    thumbnailUrl: string | null;
    modules?: Array<{ title: string }>;
  }>;
};

async function readCatalog(): Promise<CatalogShape> {
  const raw = await readFile(CATALOG_PATH, 'utf8');
  return JSON.parse(raw) as CatalogShape;
}

async function loadCoursesFromSeed(): Promise<CourseLite[]> {
  const data = await readCatalog();
  return data.courses.map((c) => ({
    slug: c.slug,
    title: c.title,
    description: c.description,
    shortDescription: c.shortDescription,
    category: c.category,
    iicrcDiscipline: c.iicrcDiscipline,
    moduleTitles: (c.modules ?? []).map((m) => m.title),
  }));
}

async function loadCoursesFromDb(): Promise<CourseLite[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('--from-db requires DATABASE_URL to be set.');
  }
  const prisma = await getPrisma();
  const rows = await prisma.lmsCourse.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      slug: true,
      title: true,
      description: true,
      shortDescription: true,
      category: true,
      iicrcDiscipline: true,
      modules: { select: { title: true }, orderBy: { orderIndex: 'asc' } },
    },
  });
  type DbCourseRow = {
    slug: string;
    title: string;
    description: string | null;
    shortDescription: string | null;
    category: string | null;
    iicrcDiscipline: string | null;
    modules: { title: string }[];
  };
  return (rows as DbCourseRow[]).map((c) => ({
    slug: c.slug,
    title: c.title,
    description: c.description,
    shortDescription: c.shortDescription,
    category: c.category,
    iicrcDiscipline: c.iicrcDiscipline,
    moduleTitles: c.modules.map((m) => m.title),
  }));
}

// ---------------------------------------------------------------------------
// Discipline inference (scaffolding aid; Claude refines during authoring)
// ---------------------------------------------------------------------------

function inferDiscipline(course: CourseLite): string | null {
  const explicit = course.iicrcDiscipline?.trim().toUpperCase();
  if (explicit && (DISCIPLINE_CODES as readonly string[]).includes(explicit)) return explicit;

  const catMatch = course.category?.trim().match(/^(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT)\b/i);
  if (catMatch) return catMatch[1]!.toUpperCase();

  const hay = `${course.title} ${course.category ?? ''}`.toLowerCase();
  if (/\bfire|smoke|soot\b/.test(hay)) return 'FSRT';
  if (/\bmould|mold|microbial|biohazard\b/.test(hay)) return 'AMRT';
  if (/structural drying|applied structural/.test(hay)) return 'ASD';
  if (/\bodour|odor|deodoris|deodoriz\b/.test(hay)) return 'OCT';
  if (/commercial carpet/.test(hay)) return 'CCT';
  if (/carpet/.test(hay)) return 'CRT';
  if (/water (damage|restoration)|\bwrt\b/.test(hay)) return 'WRT';
  return null;
}

// ---------------------------------------------------------------------------
// Briefs file
// ---------------------------------------------------------------------------

function emptyBrief(course: CourseLite): CourseThumbnailBrief {
  const discipline = inferDiscipline(course);
  return {
    slug: course.slug,
    title: course.title,
    discipline,
    concept: '',
    motifs: [],
    palette: discipline ? (DISCIPLINE_PALETTE_WORDS[discipline] ?? '') : '',
    mood: '',
    style: 'photoreal',
    composition: '',
    negativePrompt:
      'no text, no words, no letters, no numbers, no logos, no watermarks, no signage, no UI, no human faces',
    authorNote: '',
  };
}

async function loadBriefs(): Promise<ThumbnailBriefsFile | null> {
  try {
    const raw = await readFile(BRIEFS_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isThumbnailBriefsFile(parsed)) {
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
  const courses = hasFlag('from-db') ? await loadCoursesFromDb() : await loadCoursesFromSeed();
  const existing = await loadBriefs();
  const byslug = new Map((existing?.briefs ?? []).map((b) => [b.slug, b]));

  const briefs: CourseThumbnailBrief[] = courses.map((course) => {
    const prior = byslug.get(course.slug);
    // Keep an already-authored brief unless --force; always refresh the denormalised title.
    if (prior && isBriefComplete(prior) && !force) {
      return { ...prior, title: course.title };
    }
    return prior && !force ? { ...prior, title: course.title } : emptyBrief(course);
  });

  const out: ThumbnailBriefsFile = {
    version: THUMBNAIL_BRIEFS_VERSION,
    generatedAt: timestamp,
    briefs,
  };
  await writeJson(BRIEFS_PATH, out);

  const authored = briefs.filter(isBriefComplete).length;
  console.log(`Scaffolded ${briefs.length} brief(s) → ${BRIEFS_PATH}`);
  console.log(`  ${authored} already authored, ${briefs.length - authored} awaiting the skill.`);
}

// ---------------------------------------------------------------------------
// Prompt assembly (deterministic — the no-text clause is enforced in code)
// ---------------------------------------------------------------------------

function buildPrompt(brief: CourseThumbnailBrief): string {
  // Fail-closed: only registry-approved courses carry the unified accredited look.
  const isCecAccredited = CEC_APPROVED_SLUGS.has(brief.slug);

  // For accredited courses the per-course discipline palette/mood is overridden by
  // the single shared CEC signature — that shared palette IS the distinction.
  const palette = isCecAccredited
    ? CEC_SIGNATURE.palette
    : brief.palette.trim() || 'professional, restrained, brand-aligned tones';
  const mood = isCecAccredited
    ? CEC_SIGNATURE.mood
    : brief.mood.trim() || 'calm, professional, trustworthy';
  const composition =
    brief.composition.trim() ||
    'keep the focal subject off-centre and toward the lower-right; keep depth and background space';
  return [
    `A ${brief.style} background image for an online professional-training course thumbnail.`,
    `Concept: ${brief.concept.trim().replace(/\.+$/, '')}.`,
    brief.motifs.length ? `Visual elements: ${brief.motifs.join(', ')}.` : '',
    `Colour palette: ${palette}. Mood: ${mood}.`,
    isCecAccredited ? CEC_SIGNATURE.finish : '',
    `Composition: ${composition}. Wide 3:2 landscape.`,
    'Leave the upper-left third calm, uncluttered and darker so a white title can be overlaid;',
    'compose for a soft dark vertical vignette without losing the subject.',
    // Hard exclusions — always appended, never left solely to the brief.
    'Absolutely no text, no words, no letters, no numbers, no logos, no watermarks, no signage,',
    `no UI elements, no captions. ${brief.negativePrompt.trim()}.`,
    // Accredited courses additionally forbid any invented emblem that could read as an IICRC mark.
    isCecAccredited ? `${CEC_SIGNATURE.negative}.` : '',
    'Professional, modern, Australian restoration-industry context. High detail, photographic lighting,',
    'clean and uncluttered.',
  ]
    .filter(Boolean)
    .join(' ');
}

// ---------------------------------------------------------------------------
// OpenAI image generation (raw fetch, mirrors app/api/lms/public/chat/route.ts)
// ---------------------------------------------------------------------------

async function generateImage(
  apiKey: string,
  prompt: string
): Promise<{ buffer: Buffer; mime: string }> {
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, prompt, size: IMAGE_SIZE, n: 1 }),
  });
  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(`OpenAI images API ${res.status}: ${data.error?.message ?? 'unknown error'}`);
  }
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI images API returned no b64_json image data.');
  return { buffer: Buffer.from(b64, 'base64'), mime: 'image/png' };
}

// ---------------------------------------------------------------------------
// Results manifest (resumable; written after every course)
// ---------------------------------------------------------------------------

type ResultItem = {
  slug: string;
  status: 'done' | 'failed';
  url?: string;
  publicId?: string;
  promptHash?: string;
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

async function persistToSeed(updates: Map<string, string>): Promise<number> {
  const data = await readCatalog();
  let changed = 0;
  for (const course of data.courses) {
    const url = updates.get(course.slug);
    if (url && course.thumbnailUrl !== url) {
      course.thumbnailUrl = url;
      changed += 1;
    }
  }
  await writeJson(CATALOG_PATH, data);
  return changed;
}

async function persistToDb(slug: string, url: string): Promise<void> {
  const prisma = await getPrisma();
  await prisma.lmsCourse.update({ where: { slug }, data: { thumbnailUrl: url } });
}

// ---------------------------------------------------------------------------
// Spend confirmation
// ---------------------------------------------------------------------------

async function confirmSpend(count: number): Promise<boolean> {
  console.log(
    `\nAbout to generate ${count} image(s) with ${MODEL} at ${IMAGE_SIZE} and upload to Cloudinary.`
  );
  console.log('This spends real OpenAI credits. Re-runs skip already-done courses.');
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
  const done = new Set(results.items.filter((i) => i.status === 'done').map((i) => i.slug));

  // Decide the work list.
  let queue = briefsFile.briefs.filter((b) => (onlySlug ? b.slug === onlySlug : true));
  if (onlySlug && queue.length === 0) {
    throw new Error(`No brief found for --slug=${onlySlug}.`);
  }

  const incomplete = queue.filter((b) => !isBriefComplete(b));
  if (incomplete.length) {
    console.warn(
      `⚠ ${incomplete.length} brief(s) not authored yet (run the course-thumbnails skill): ${incomplete
        .map((b) => b.slug)
        .join(', ')}`
    );
  }
  queue = queue.filter(isBriefComplete);
  if (!force) queue = queue.filter((b) => !done.has(b.slug));
  if (queue.length > limit) queue = queue.slice(0, limit);

  if (queue.length === 0) {
    console.log('Nothing to generate (all briefs done/incomplete or filtered out).');
    return;
  }
  if (queue.length > HARD_CAP) {
    throw new Error(
      `Refusing to generate ${queue.length} images (> HARD_CAP ${HARD_CAP}). Use --limit or raise THUMBNAIL_MAX_GENERATIONS.`
    );
  }

  if (dryRun) {
    for (const brief of queue) {
      console.log(`\n── ${brief.slug} (${brief.discipline ?? 'no discipline'}) ──`);
      console.log(buildPrompt(brief));
    }
    console.log(`\n[dry-run] ${queue.length} prompt(s) shown. No API calls, no spend.`);
    return;
  }

  // Real run: preflight config, then confirm spend.
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set (required for image generation).');
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).'
    );
  }
  if (persist !== 'seed' && !process.env.DATABASE_URL?.trim()) {
    throw new Error(`--persist=${persist} requires DATABASE_URL.`);
  }
  if (!(await confirmSpend(queue.length))) return;

  const seedUpdates = new Map<string, string>();
  const upsertResult = (item: ResultItem) => {
    const idx = results.items.findIndex((i) => i.slug === item.slug);
    if (idx >= 0) results.items[idx] = item;
    else results.items.push(item);
  };

  let ok = 0;
  for (const brief of queue) {
    try {
      const prompt = buildPrompt(brief);
      const promptHash = createHash('sha256').update(prompt).digest('hex').slice(0, 12);
      const { buffer, mime } = await generateImage(apiKey, prompt);
      const { url, publicId } = await uploadCourseThumbnailToCloudinary(buffer, mime);

      if (persist === 'db' || persist === 'both') await persistToDb(brief.slug, url);
      if (persist === 'seed' || persist === 'both') seedUpdates.set(brief.slug, url);

      upsertResult({ slug: brief.slug, status: 'done', url, publicId, promptHash, generatedAt: timestamp });
      await writeJson(RESULTS_PATH, results); // write-after-each (resumable)
      ok += 1;
      console.log(`✓ ${brief.slug} → ${url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      upsertResult({ slug: brief.slug, status: 'failed', error: message, generatedAt: timestamp });
      await writeJson(RESULTS_PATH, results);
      console.error(`✗ ${brief.slug}: ${message}`);
    }
  }

  if (seedUpdates.size) {
    const changed = await persistToSeed(seedUpdates);
    console.log(`Updated ${changed} thumbnailUrl(s) in ${CATALOG_PATH}.`);
    console.log('Next: run `npm run db:seed-courses` to import the new thumbnails into the DB.');
  }
  console.log(`\nDone. ${ok}/${queue.length} generated.`);
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
    'Usage: tsx scripts/generate-course-thumbnails.ts (--plan | --generate) [--dry-run] [--slug=<slug>] [--limit=N] [--force] [--from-db] [--persist=seed|db|both] [--yes]'
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
