/**
 * Demo-video generator — deterministic half of the `demo-screencasts` skill.
 *
 * Claude authors one `DemoFlow` per video in `src/lib/screencast/demo-flows.ts` (the part
 * that needs to understand the user journey). This script does the mechanical work in three
 * stackable layers:
 *
 *   1. RECORD    Drive the seeded demo account through the flow's steps with Playwright,
 *                capturing a screencast (`output/demo-screencast/raw/<id>.webm`).
 *   2. COMPOSITE Overlay the paired HeyGen avatar video (produced by the brand-video pipeline,
 *                `output/brand-video/videos/<script>.mp4`) as a picture-in-picture corner with
 *                FFmpeg, take the avatar's audio as the voiceover, soft-mux the brand `.srt`,
 *                and write `output/demo-screencast/final/<id>.mp4`.
 *   3. UPLOAD    Push the final MP4 to Cloudinary and (with --persist) write the URL into the
 *                flow's `LmsLesson.contentBody`.
 *
 * Phases (mirrors scripts/automate-brand-videos.ts):
 *   --plan       Validate the flow manifest; write a job plan. No browser, no spend.
 *   --record     Record screencasts for selected flows (skips already-recorded unless --force).
 *   --composite  FFmpeg composite for selected flows (needs the avatar MP4 to exist).
 *   --upload     Upload finals to Cloudinary; --persist also writes LmsLesson.contentBody.
 *   --execute    record → composite → upload for selected flows.
 *
 * Modifiers: --id=<flow> · --limit=N · --force · --persist · --yes (skip the upload/DB
 * confirmation) · --dry-run (with --record/--composite: print the resolved steps + FFmpeg
 * command; no browser/FFmpeg/upload).
 *
 * Authoring tool only: run manually via `npx tsx`, never in CI (it drives a browser, depends
 * on HeyGen output, and spends Cloudinary / writes the DB).
 */
import 'dotenv/config';

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { demoFlowsFile } from '../src/lib/screencast/demo-flows';
import { isFlowRecordable, type DemoFlow, type DemoStep } from '../src/lib/screencast/demo-flow-types';
import { isCloudinaryConfigured, uploadVideoToCloudinary } from '../src/lib/server/cloudinary-upload';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const OUT_DIR = join(ROOT, 'output', 'demo-screencast');
const RAW_DIR = join(OUT_DIR, 'raw');
const FINAL_DIR = join(OUT_DIR, 'final');
const RESULTS_PATH = join(OUT_DIR, 'results.json');
const PLAN_PATH = join(OUT_DIR, 'demo-plan.json');

// The PiP avatar + captions come from the brand-video pipeline's downloaded outputs.
const BRAND_VIDEO_DIR = join(ROOT, 'output', 'brand-video', 'videos');
const BRAND_CAPTION_DIR = join(ROOT, 'output', 'brand-video', 'captions');

const STORAGE_STATE_PATH = join(ROOT, 'playwright', '.auth', 'student.json');

const BASE_URL = process.env.DEMO_RECORD_BASE_URL ?? 'http://localhost:3000';
const HARD_CAP = parsePositiveInt(process.env.DEMO_VIDEO_MAX, 'DEMO_VIDEO_MAX', 12);
const PIP_MARGIN = parsePositiveInt(process.env.DEMO_PIP_MARGIN, 'DEMO_PIP_MARGIN', 24);
// Playwright recordings don't render a mouse pointer; inject a synthetic one so the
// viewer can follow clicks. Disable with DEMO_CURSOR=0.
const CURSOR_ENABLED = process.env.DEMO_CURSOR !== '0';

// Seeded demo account (scripts/seed-e2e-user.ts) — same credentials as e2e/auth.setup.ts.
const STUDENT = {
  email: process.env.DEMO_STUDENT_EMAIL ?? 'student@carsi.com.au',
  password: process.env.DEMO_STUDENT_PASSWORD ?? 'student123',
} as const;

type Command = 'plan' | 'record' | 'composite' | 'upload' | 'execute';

type FlowResult = {
  id: string;
  status: 'recorded' | 'composited' | 'uploaded' | 'failed';
  rawPath?: string;
  finalPath?: string;
  url?: string;
  publicId?: string;
  lessonId?: string;
  persisted?: boolean;
  failure?: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// arg helpers (same shape as scripts/automate-brand-videos.ts)
// ---------------------------------------------------------------------------
function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/** Parse a positive integer from a CLI/env value, or throw so bad input fails fast. */
function parsePositiveInt(raw: string | undefined, label: string, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid ${label}: "${raw}". Expected a positive integer.`);
  }
  return n;
}

function getCommand(): Command {
  if (hasFlag('execute')) return 'execute';
  if (hasFlag('upload')) return 'upload';
  if (hasFlag('composite')) return 'composite';
  if (hasFlag('record')) return 'record';
  return 'plan';
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function confirm(question: string): Promise<boolean> {
  if (hasFlag('yes')) return true;
  if (!process.stdin.isTTY) {
    throw new Error(`Refusing to proceed without confirmation (non-interactive). Re-run with --yes.\n${question}`);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

// ---------------------------------------------------------------------------
// flow selection / plan
// ---------------------------------------------------------------------------
function selectedFlows(): DemoFlow[] {
  const id = argValue('id');
  let flows = demoFlowsFile.flows.filter(isFlowRecordable);
  if (id) {
    const ids = new Set(id.split(',').map((s) => s.trim()).filter(Boolean));
    flows = flows.filter((f) => ids.has(f.id));
    if (flows.length === 0) throw new Error(`No flow matched --id=${id}`);
  }
  const limit = parsePositiveInt(argValue('limit'), '--limit', HARD_CAP);
  return flows.slice(0, Math.min(limit, HARD_CAP));
}

function avatarPathFor(flow: DemoFlow): string | null {
  if (!flow.brandVideoScriptId) return null;
  return join(BRAND_VIDEO_DIR, `${slugify(flow.brandVideoScriptId)}.mp4`);
}

function captionPathFor(flow: DemoFlow): string | null {
  if (!flow.brandVideoScriptId) return null;
  return join(BRAND_CAPTION_DIR, `${slugify(flow.brandVideoScriptId)}.srt`);
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function planFlows(): Promise<void> {
  const flows = selectedFlows();
  const jobs = flows.map((flow) => ({
    id: flow.id,
    title: flow.title,
    purpose: flow.purpose,
    auth: flow.auth,
    brandVideoScriptId: flow.brandVideoScriptId,
    avatarPath: avatarPathFor(flow),
    rawPath: join(RAW_DIR, `${flow.id}.webm`),
    finalPath: join(FINAL_DIR, `${flow.id}.mp4`),
    steps: flow.steps.length,
    lessonId: flow.lessonId ?? null,
  }));
  await writeJson(PLAN_PATH, { generatedAt: new Date().toISOString(), count: jobs.length, jobs });
  console.log(`Planned ${jobs.length} demo-video job(s) → ${PLAN_PATH}`);
  for (const job of jobs) {
    console.log(`  • ${job.id} (${job.purpose}, ${job.steps} steps, avatar: ${job.brandVideoScriptId ?? 'none'})`);
  }
}

// ---------------------------------------------------------------------------
// results manifest (resumable; write-after-each)
// ---------------------------------------------------------------------------
async function readResults(): Promise<Record<string, FlowResult>> {
  if (!(await exists(RESULTS_PATH))) return {};
  try {
    const parsed = JSON.parse(await readFile(RESULTS_PATH, 'utf8')) as { results?: FlowResult[] };
    return Object.fromEntries((parsed.results ?? []).map((r) => [r.id, r]));
  } catch {
    return {};
  }
}

async function writeResult(all: Record<string, FlowResult>, result: FlowResult): Promise<void> {
  all[result.id] = result;
  await writeJson(RESULTS_PATH, {
    updatedAt: new Date().toISOString(),
    results: Object.values(all),
  });
}

// ---------------------------------------------------------------------------
// RECORD — Playwright drives the demo account and captures a screencast
// ---------------------------------------------------------------------------
async function ensureStudentSession(browser: Browser): Promise<string> {
  if (await exists(STORAGE_STATE_PATH)) return STORAGE_STATE_PATH;

  console.log('  No saved demo session — logging in once to mint one…');
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[name="email"], input[type="email"]').fill(STUDENT.email);
  await page.locator('input[type="password"]').fill(STUDENT.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard**', { timeout: 20_000 });
  await mkdir(dirname(STORAGE_STATE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await context.close();
  return STORAGE_STATE_PATH;
}

async function applyStep(page: Page, step: DemoStep): Promise<void> {
  switch (step.action) {
    case 'goto':
      await page.goto(step.path, { waitUntil: 'domcontentloaded' });
      break;
    case 'click':
      await page.locator(step.selector).first().click({ timeout: 15_000 });
      break;
    case 'fill':
      await page.locator(step.selector).first().fill(step.value);
      break;
    case 'scroll':
      await page.evaluate((to) => {
        const y = to === 'bottom' ? document.body.scrollHeight : to === 'top' ? 0 : Number(to);
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, step.to);
      await page.waitForTimeout(800);
      break;
    case 'wait':
      await page.waitForTimeout(step.ms);
      break;
    case 'highlight':
      // Pulse a spotlight on the target, and glide the synthetic cursor to it.
      await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const prev = el.style.boxShadow;
        el.style.transition = 'box-shadow .3s ease';
        el.style.boxShadow = '0 0 0 4px rgba(20,111,194,.9), 0 0 24px rgba(20,111,194,.6)';
        setTimeout(() => {
          el.style.boxShadow = prev;
        }, 1400);
      }, step.selector);
      if (CURSOR_ENABLED) {
        const box = await page
          .locator(step.selector)
          .first()
          .boundingBox()
          .catch(() => null);
        if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      }
      await page.waitForTimeout(1500);
      break;
  }
}

/**
 * Browser-side script that draws a synthetic mouse pointer following real mouse events,
 * since Playwright's video recorder never renders the OS cursor. Runs before page scripts on
 * every navigation (added via context.addInitScript).
 */
function cursorInitScript(): void {
  const ID = '__demo_cursor__';
  function ensureCursor() {
    if (document.getElementById(ID)) return;
    const c = document.createElement('div');
    c.id = ID;
    Object.assign(c.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '22px',
      height: '22px',
      marginLeft: '-11px',
      marginTop: '-11px',
      borderRadius: '50%',
      background: 'rgba(20,111,194,0.35)',
      border: '2px solid rgba(20,111,194,0.9)',
      boxShadow: '0 0 8px rgba(20,111,194,0.6)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      transition: 'transform .05s linear, background .2s, opacity .2s',
      transform: 'translate(-100px,-100px)',
      opacity: '0',
    } as Partial<CSSStyleDeclaration>);
    document.documentElement.appendChild(c);
    window.addEventListener(
      'mousemove',
      (e) => {
        c.style.opacity = '1';
        c.style.transform = `translate(${(e as MouseEvent).clientX}px, ${(e as MouseEvent).clientY}px)`;
      },
      true
    );
    window.addEventListener(
      'mousedown',
      () => {
        c.style.background = 'rgba(20,111,194,0.65)';
        setTimeout(() => {
          c.style.background = 'rgba(20,111,194,0.35)';
        }, 200);
      },
      true
    );
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureCursor);
  } else {
    ensureCursor();
  }
}

async function recordFlow(browser: Browser, flow: DemoFlow): Promise<string> {
  const rawPath = join(RAW_DIR, `${flow.id}.webm`);
  await mkdir(RAW_DIR, { recursive: true });

  const storageState = flow.auth === 'student' ? await ensureStudentSession(browser) : undefined;
  const context: BrowserContext = await browser.newContext({
    baseURL: BASE_URL,
    viewport: flow.viewport,
    storageState,
    recordVideo: { dir: RAW_DIR, size: flow.viewport },
  });
  if (CURSOR_ENABLED) await context.addInitScript(cursorInitScript);
  const page = await context.newPage();

  try {
    for (const step of flow.steps) {
      await applyStep(page, step);
    }
  } finally {
    const video = page.video();
    await context.close(); // flushes the recording
    if (video) {
      await video.saveAs(rawPath);
      await video.delete(); // remove the auto-named temp copy
    }
  }
  return rawPath;
}

// ---------------------------------------------------------------------------
// COMPOSITE — FFmpeg PiP overlay
// ---------------------------------------------------------------------------
function resolveFfmpegBin(): string {
  // Prefer the bundled static binary; fall back to FFMPEG_PATH / system `ffmpeg`.
  try {
    const installer = require('@ffmpeg-installer/ffmpeg') as { path: string };
    if (installer?.path) return installer.path;
  } catch {
    /* package not installed — fall through */
  }
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

function overlayExpr(corner: DemoFlow['pip']['corner'], margin: number): string {
  switch (corner) {
    case 'bl':
      return `${margin}:H-h-${margin}`;
    case 'tr':
      return `W-w-${margin}:${margin}`;
    case 'tl':
      return `${margin}:${margin}`;
    case 'br':
    default:
      return `W-w-${margin}:H-h-${margin}`;
  }
}

function buildFfmpegArgs(
  flow: DemoFlow,
  rawPath: string,
  avatarPath: string | null,
  captionPath: string | null,
  outPath: string
): string[] {
  const vw = flow.viewport.width;
  const vh = flow.viewport.height;

  // Silent b-roll: just normalise the webm to a clean H.264 MP4.
  if (!avatarPath) {
    return [
      '-y',
      '-i', rawPath,
      '-vf', `scale=${vw}:${vh},setsar=1,format=yuv420p`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-an',
      outPath,
    ];
  }

  const pipW = Math.round((vw * flow.pip.widthPct) / 100 / 2) * 2; // even width for yuv420p
  const overlay = overlayExpr(flow.pip.corner, PIP_MARGIN);
  const filter =
    `[0:v]scale=${vw}:${vh},setsar=1[bg];` +
    `[1:v]scale=${pipW}:-2[pip];` +
    `[bg][pip]overlay=${overlay}:format=auto,format=yuv420p[v]`;

  const args = ['-y', '-i', rawPath, '-i', avatarPath];
  const hasCaptions = !!captionPath;
  if (hasCaptions) args.push('-i', captionPath);

  args.push(
    '-filter_complex', filter,
    '-map', '[v]',
    '-map', '1:a', // voiceover comes from the avatar
  );
  if (hasCaptions) {
    args.push('-map', '2:0', '-c:s', 'mov_text');
  }
  args.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-c:a', 'aac',
    '-shortest', // end when the avatar narration ends
    outPath,
  );
  return args;
}

function runFfmpeg(args: string[]): Promise<void> {
  const bin = resolveFfmpegBin();
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'inherit'] });
    proc.on('error', (err) =>
      reject(new Error(`Failed to launch FFmpeg (${bin}): ${err.message}. Install @ffmpeg-installer/ffmpeg or set FFMPEG_PATH.`))
    );
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`))
    );
  });
}

async function compositeFlow(flow: DemoFlow): Promise<string> {
  const rawPath = join(RAW_DIR, `${flow.id}.webm`);
  const avatarPath = avatarPathFor(flow);
  const captionPathRaw = captionPathFor(flow);
  const captionPath = captionPathRaw && (await exists(captionPathRaw)) ? captionPathRaw : null;
  const finalPath = join(FINAL_DIR, `${flow.id}.mp4`);

  // A dry-run previews the command without requiring any inputs to exist yet.
  if (hasFlag('dry-run')) {
    const args = buildFfmpegArgs(flow, rawPath, avatarPath, captionPath, finalPath);
    console.log(`  [dry-run] ${resolveFfmpegBin()} ${args.join(' ')}`);
    return finalPath;
  }

  if (!(await exists(rawPath))) {
    throw new Error(`No screencast for "${flow.id}" — run --record first (${rawPath}).`);
  }
  if (avatarPath && !(await exists(avatarPath))) {
    throw new Error(
      `Avatar video missing for "${flow.id}" (${avatarPath}). Run \`npm run video:brand:generate -- --ids=${flow.brandVideoScriptId}\` first.`
    );
  }
  await mkdir(FINAL_DIR, { recursive: true });
  const args = buildFfmpegArgs(flow, rawPath, avatarPath, captionPath, finalPath);
  await runFfmpeg(args);
  return finalPath;
}

// ---------------------------------------------------------------------------
// UPLOAD + optional persist
// ---------------------------------------------------------------------------
async function persistLessonUrl(lessonId: string, url: string): Promise<void> {
  // Prisma is imported lazily — the generated client may be absent in author-only setups.
  const { prisma } = await import('../src/lib/prisma');
  await prisma.lmsLesson.update({
    where: { id: lessonId },
    data: { contentType: 'video', contentBody: url },
  });
}

async function uploadFlow(flow: DemoFlow, doPersist: boolean): Promise<FlowResult> {
  const finalPath = join(FINAL_DIR, `${flow.id}.mp4`);
  if (!(await exists(finalPath))) {
    throw new Error(`No final video for "${flow.id}" — run --composite first (${finalPath}).`);
  }
  const buffer = await readFile(finalPath);
  const { url, publicId } = await uploadVideoToCloudinary(buffer);

  let persisted = false;
  if (doPersist && flow.lessonId) {
    await persistLessonUrl(flow.lessonId, url);
    persisted = true;
  }
  return {
    id: flow.id,
    status: 'uploaded',
    finalPath,
    url,
    publicId,
    lessonId: flow.lessonId,
    persisted,
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const command = getCommand();
  const flows = selectedFlows();
  const force = hasFlag('force');
  const dryRun = hasFlag('dry-run');
  const doPersist = hasFlag('persist');
  const results = await readResults();

  console.log(`Demo-video pipeline · command=${command} · ${flows.length} flow(s) · base=${BASE_URL}`);

  if (command === 'plan') {
    await planFlows();
    return;
  }

  // Preflight for the spend/IO phases.
  if (command === 'upload' || command === 'execute') {
    if (!dryRun && !isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).');
    }
    if (!dryRun) {
      const persistNote = doPersist ? ' and WRITE LmsLesson.contentBody for flows with a lessonId' : '';
      const ok = await confirm(`Upload ${flows.length} video(s) to Cloudinary${persistNote}?`);
      if (!ok) {
        console.log('Aborted before upload.');
        return;
      }
    }
  }

  const needsBrowser = command === 'record' || command === 'execute';
  let browser: Browser | null = null;
  if (needsBrowser && !dryRun) {
    browser = await chromium.launch();
  }

  let hadFailures = false;
  try {
    for (const flow of flows) {
      try {
        if (command === 'record' || command === 'execute') {
          const alreadyRecorded = await exists(join(RAW_DIR, `${flow.id}.webm`));
          if (alreadyRecorded && !force) {
            console.log(`• ${flow.id}: screencast exists, skipping record (use --force to re-record)`);
          } else if (dryRun) {
            console.log(`• ${flow.id}: [dry-run] would record ${flow.steps.length} steps as ${flow.auth}`);
            for (const s of flow.steps) console.log(`    - ${JSON.stringify(s)}`);
          } else {
            console.log(`• ${flow.id}: recording…`);
            const rawPath = await recordFlow(browser!, flow);
            await writeResult(results, { id: flow.id, status: 'recorded', rawPath, updatedAt: new Date().toISOString() });
            console.log(`    recorded → ${rawPath}`);
          }
        }

        if (command === 'composite' || command === 'execute') {
          console.log(`• ${flow.id}: compositing…`);
          const finalPath = await compositeFlow(flow);
          if (!dryRun) {
            await writeResult(results, { id: flow.id, status: 'composited', finalPath, updatedAt: new Date().toISOString() });
            console.log(`    composited → ${finalPath}`);
          }
        }

        if (command === 'upload' || command === 'execute') {
          if (dryRun) {
            console.log(`• ${flow.id}: [dry-run] would upload final/${flow.id}.mp4 to Cloudinary`);
          } else {
            console.log(`• ${flow.id}: uploading…`);
            const result = await uploadFlow(flow, doPersist);
            await writeResult(results, result);
            console.log(`    uploaded → ${result.url}${result.persisted ? ` (lesson ${result.lessonId} updated)` : ''}`);
          }
        }
      } catch (err) {
        hadFailures = true;
        const failure = err instanceof Error ? err.message : String(err);
        console.error(`✗ ${flow.id}: ${failure}`);
        if (!dryRun) {
          await writeResult(results, { id: flow.id, status: 'failed', failure, updatedAt: new Date().toISOString() });
        }
      }
    }
    // Surface per-flow failures as a non-zero exit so automation/shells notice.
    if (hadFailures) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }

  // Clean up any stray auto-named webm temp files Playwright may have left behind.
  if (needsBrowser && !dryRun) {
    await rm(join(RAW_DIR, 'tmp'), { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
