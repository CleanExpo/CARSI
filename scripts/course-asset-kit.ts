/**
 * course-asset-kit — one orchestrating authoring tool so every new CARSI course
 * can ship its full media kit by default (GP-488).
 *
 * Consolidates what was done as one-offs for the launch courses (flashcards,
 * slides, audio-overview script, quiz, image briefs) behind a single CLI. It is
 * the DETERMINISTIC front-end of the authoring pipeline: it PLANS what kit pieces
 * a course has vs. needs, and SCAFFOLDS extractive-or-empty asset files from the
 * course's already-delivered lesson content. It NEVER invents factual content and
 * NEVER spends API credits — the spend generators (thumbnails, voiceover, video)
 * remain their own scripts and run AFTER a human truth-gate authoring pass fills
 * the scaffolds in.
 *
 * Usage:
 *   npx tsx scripts/course-asset-kit.ts --slug=<course> --plan
 *   npx tsx scripts/course-asset-kit.ts --slug=<course> --generate \
 *       [--assets=flashcards,slides,audio-script,image-briefs,quiz-scaffold] [--force]
 *
 * Guardrails (both phases):
 *   - Refuses a course whose catalogue entry lacks an explicit cecHours; warns
 *     loudly on the legacy null (see CLAUDE.md § CEC hours).
 *   - Runs the IICRC CEC banned-phrase scanner over all extracted text.
 *   - --generate is idempotent + non-destructive: never overwrites an existing
 *     asset file unless --force.
 *
 * This is an authoring tool — run manually, never in CI or the app runtime.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkCecHours } from '../src/lib/course-kit/cec-guard';
import { detectAttachedResources } from '../src/lib/course-kit/plan';
import {
  buildAudioScriptScaffold,
  buildFlashcardsScaffold,
  buildImageBriefsScaffold,
  buildQuizScaffold,
  buildSlidesScaffold,
  scanCourseForBannedPhrases,
} from '../src/lib/course-kit/scaffold';
import type { KitCourse } from '../src/lib/course-kit/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, '..', 'data', 'seed');
const CATALOG_PATH = join(SEED_DIR, 'courses-catalog.json');

// ---------------------------------------------------------------------------
// Asset registry — where each kit piece lives and how it is built.
// ---------------------------------------------------------------------------

type AssetId = 'flashcards' | 'slides' | 'audio-script' | 'image-briefs' | 'quiz-scaffold';

const ALL_ASSETS: AssetId[] = ['flashcards', 'slides', 'audio-script', 'image-briefs', 'quiz-scaffold'];

/** Path (relative to data/seed) where the DELIVERED asset for a course lives. */
function deliveredAssetPath(asset: AssetId, slug: string): string {
  switch (asset) {
    case 'flashcards':
      return join(SEED_DIR, 'flashcards', `${slug}.json`);
    case 'slides':
      return join(SEED_DIR, 'slides', `${slug}.json`);
    case 'audio-script':
      return join(SEED_DIR, 'audio-overview', `${slug}.script.json`);
    case 'image-briefs':
      return join(SEED_DIR, 'image-briefs', `${slug}.json`);
    case 'quiz-scaffold':
      // Scaffolds are written to a dedicated subdir so they never collide with
      // the hand-authored, shipping quiz files at data/seed/*.json.
      return join(SEED_DIR, 'quiz-scaffolds', `${slug}.quiz-scaffold.json`);
  }
}

function buildScaffold(asset: AssetId, course: KitCourse): unknown {
  switch (asset) {
    case 'flashcards':
      return buildFlashcardsScaffold(course);
    case 'slides':
      return buildSlidesScaffold(course);
    case 'audio-script':
      return buildAudioScriptScaffold(course);
    case 'image-briefs':
      return buildImageBriefsScaffold(course);
    case 'quiz-scaffold':
      return buildQuizScaffold(course);
  }
}

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// Catalogue loading (raw — we only need a subset and want the raw cecHours key
// presence, so we read JSON directly rather than through the typed validator).
// ---------------------------------------------------------------------------

type RawLesson = { id: string; title: string; contentBody: string | null; resources?: unknown };
type RawModule = { title: string; lessons: RawLesson[] };
type RawCourse = {
  slug: string;
  title: string;
  cecHours?: number | null;
  modules: RawModule[];
};

async function loadCourse(slug: string): Promise<{ course: KitCourse; cecHoursExplicit: boolean }> {
  const raw = await readFile(CATALOG_PATH, 'utf8');
  const data = JSON.parse(raw) as { courses: RawCourse[] };
  const found = data.courses.find((c) => c.slug === slug);
  if (!found) {
    const available = data.courses.map((c) => c.slug).join('\n  ');
    throw new Error(`No course with slug "${slug}" in the catalogue.\nAvailable slugs:\n  ${available}`);
  }
  const cecHoursExplicit = Object.prototype.hasOwnProperty.call(found, 'cecHours');
  const course: KitCourse = {
    slug: found.slug,
    title: found.title,
    // Preserve the undefined-vs-null distinction the guard depends on.
    cecHours: cecHoursExplicit ? found.cecHours : undefined,
    modules: (found.modules ?? []).map((m) => ({
      title: m.title,
      lessons: (m.lessons ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        contentBody: l.contentBody ?? null,
        resources: l.resources,
      })),
    })),
  };
  return { course, cecHoursExplicit };
}

// ---------------------------------------------------------------------------
// Guardrails shared by both phases
// ---------------------------------------------------------------------------

/** @returns true when it is safe to proceed. */
function runGuardrails(course: KitCourse): boolean {
  const cec = checkCecHours(course.cecHours);
  const badge = cec.level === 'ok' ? '✓' : cec.level === 'warn' ? '⚠' : '✗';
  console.log(`\n${badge} cecHours guard: ${cec.message}`);
  if (cec.level === 'refuse') {
    console.error('Refusing to run — fix the catalogue entry first.');
    return false;
  }

  const hits = scanCourseForBannedPhrases(course);
  if (hits.length === 0) {
    console.log('✓ IICRC CEC terminology scan: no banned phrases in extracted text.');
  } else {
    console.warn(`⚠ IICRC CEC terminology scan: ${hits.length} hit(s) in delivered content:`);
    for (const hit of hits) {
      console.warn(`    - [${hit.where ?? '?'}] ${hit.message}\n      → ${hit.text}`);
    }
    console.warn('  Fix the source lesson copy before publishing (does not block scaffolding).');
  }
  return true;
}

// ---------------------------------------------------------------------------
// --plan
// ---------------------------------------------------------------------------

async function planPhase(slug: string): Promise<void> {
  const { course } = await loadCourse(slug);
  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  console.log(`\n═══ course-asset-kit --plan — ${course.slug} ═══`);
  console.log(`Title: ${course.title}`);
  console.log(`Modules: ${course.modules.length}  Lessons: ${totalLessons}`);

  if (!runGuardrails(course)) {
    process.exitCode = 1;
    return;
  }

  console.log('\nKit pieces (delivered asset file present?):');
  for (const asset of ALL_ASSETS) {
    const present = await fileExists(deliveredAssetPath(asset, slug));
    console.log(`  [${present ? 'x' : ' '}] ${asset}`);
  }

  const attached = detectAttachedResources(course);
  console.log('\nLesson resources attached in the catalogue:');
  console.log(
    `  ${attached.lessonsWithResources}/${attached.totalLessons} lesson(s) carry a resource; ` +
      `kinds present: ${[...attached.kinds].sort().join(', ') || '(none)'}`
  );

  const gaps: string[] = [];
  for (const asset of ALL_ASSETS) {
    if (!(await fileExists(deliveredAssetPath(asset, slug)))) gaps.push(asset);
  }
  console.log('\nGap report:');
  if (gaps.length === 0) {
    console.log('  No gaps — every kit piece has a delivered file.');
  } else {
    console.log(`  Missing ${gaps.length}/${ALL_ASSETS.length}: ${gaps.join(', ')}`);
    console.log(
      `  Scaffold them with: npx tsx scripts/course-asset-kit.ts --slug=${slug} --generate --assets=${gaps.join(',')}`
    );
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// --generate
// ---------------------------------------------------------------------------

function parseAssets(): AssetId[] {
  const raw = argValue('assets');
  if (!raw) return ALL_ASSETS;
  const requested = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = requested.filter((a) => !ALL_ASSETS.includes(a as AssetId));
  if (invalid.length) {
    throw new Error(`Unknown --assets: ${invalid.join(', ')}. Valid: ${ALL_ASSETS.join(', ')}`);
  }
  return requested as AssetId[];
}

async function generatePhase(slug: string): Promise<void> {
  const force = hasFlag('force');
  const assets = parseAssets();
  const { course } = await loadCourse(slug);
  console.log(`\n═══ course-asset-kit --generate — ${course.slug} ═══`);
  console.log(`Assets: ${assets.join(', ')}${force ? '  (--force)' : ''}`);

  if (!runGuardrails(course)) {
    process.exitCode = 1;
    return;
  }

  console.log('\nScaffolding:');
  let written = 0;
  let skipped = 0;
  for (const asset of assets) {
    const path = deliveredAssetPath(asset, slug);
    const rel = path.slice(join(__dirname, '..').length + 1);
    if ((await fileExists(path)) && !force) {
      console.log(`  ⏭  ${asset}: exists, kept (pass --force to overwrite) → ${rel}`);
      skipped += 1;
      continue;
    }
    const scaffold = buildScaffold(asset, course);
    await writeJson(path, scaffold);
    console.log(`  ✓ ${asset}: wrote scaffold → ${rel}`);
    written += 1;
  }
  console.log(`\nDone. ${written} written, ${skipped} kept (non-destructive).`);
  if (written > 0) {
    console.log('Next: run the truth-gate authoring pass to fill empty fields, then attach + seed.');
    console.log('See docs/runbooks/course-asset-kit.md.');
  }
  console.log('');
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const slug = argValue('slug');
  if (!slug) {
    console.log(
      'Usage: npx tsx scripts/course-asset-kit.ts --slug=<course> (--plan | --generate) ' +
        '[--assets=flashcards,slides,audio-script,image-briefs,quiz-scaffold] [--force]'
    );
    process.exitCode = 1;
    return;
  }
  if (hasFlag('plan')) {
    await planPhase(slug);
    return;
  }
  if (hasFlag('generate')) {
    await generatePhase(slug);
    return;
  }
  console.log('Specify a phase: --plan or --generate.');
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
