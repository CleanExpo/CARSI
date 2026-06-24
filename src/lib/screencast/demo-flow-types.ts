/**
 * JSON/TS shape for the demo-screencast flow manifest (`src/lib/screencast/demo-flows.ts`).
 *
 * The flows file is the contract between the two halves of the demo-video tool:
 *   - Claude (the `demo-screencasts` skill) AUTHORS one `DemoFlow` per video — this is
 *     where the understanding of the user journey, the steps to perform, and the pairing
 *     to a narration script lives.
 *   - `scripts/generate-demo-videos.ts` CONSUMES the flows deterministically: drives the
 *     seeded demo account through the steps with Playwright (recording a screencast),
 *     composites a HeyGen avatar as a picture-in-picture overlay with FFmpeg, uploads the
 *     result to Cloudinary, and optionally writes the URL into `LmsLesson.contentBody`.
 *
 * A flow references a `brandVideoScriptId` (see `src/lib/brand-video-assistant.ts`) so the
 * footage and its narration/avatar are paired by data, and the avatar's duration drives the
 * flow's pacing (the per-step `wait` dwells should add up to roughly the narration length).
 */
export const DEMO_FLOWS_VERSION = 1 as const;

/** A single scripted action the demo account performs while the screen is recording. */
export type DemoStep =
  /** Navigate to an app path, e.g. '/dashboard/student' (resolved against DEMO_RECORD_BASE_URL). */
  | { action: 'goto'; path: string }
  /** Click the first element matching a CSS selector. `label` is a review aid only. */
  | { action: 'click'; selector: string; label?: string }
  /** Type a value into an input (used by the guest login flow; never real PII). */
  | { action: 'fill'; selector: string; value: string }
  /** Scroll the page to reveal content below/above the fold, or to an absolute Y offset. */
  | { action: 'scroll'; to: 'bottom' | 'top' | number }
  /** Dwell in place so the avatar narration has time to play over the current view. */
  | { action: 'wait'; ms: number }
  /** Pulse a spotlight on a target so the viewer's eye follows it (Playwright shows no cursor). */
  | { action: 'highlight'; selector: string; label?: string };

/** Which corner the avatar PiP sits in, and how wide it is as a fraction of frame width. */
export type DemoPip = {
  corner: 'br' | 'bl' | 'tr' | 'tl';
  /** PiP width as a percentage of the screencast width (e.g. 26 → 26%). */
  widthPct: number;
};

export type DemoFlowPurpose = 'lesson-walkthrough' | 'brand-broll' | 'marketing-reel';

export type DemoFlow = {
  /** Stable identity key; also the output basename (`<id>.webm` / `<id>.mp4`). */
  id: string;
  /** Human title for the plan/manifest and review. */
  title: string;
  /** What the footage is for; drives whether/how it gets persisted or concatenated. */
  purpose: DemoFlowPurpose;
  /**
   * Joins to `brandVideoScripts[].id` for the avatar/narration to overlay. `null` means a
   * SILENT b-roll clip (transcode only; no PiP, no audio) — used as raw footage for editing.
   */
  brandVideoScriptId: string | null;
  /** 'student' reuses the seeded demo session; 'guest' records a public, logged-out journey. */
  auth: 'student' | 'guest';
  /** Recording viewport; also the screencast resolution. */
  viewport: { width: number; height: number };
  /** Avatar picture-in-picture placement (ignored when `brandVideoScriptId` is null). */
  pip: DemoPip;
  /** Ordered actions performed while recording. */
  steps: DemoStep[];
  /**
   * Optional: when set and the run is `--persist`, the final Cloudinary URL is written into
   * this lesson's `contentBody` (with `contentType: 'video'`).
   */
  lessonId?: string;
};

export type DemoFlowsFile = {
  version: typeof DEMO_FLOWS_VERSION;
  generatedAt: string;
  flows: DemoFlow[];
};

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

const STEP_ACTIONS = ['goto', 'click', 'fill', 'scroll', 'wait', 'highlight'] as const;

/** Narrow a value to a structurally-valid `DemoStep`. */
export function isDemoStep(value: unknown): value is DemoStep {
  if (typeof value !== 'object' || value === null) return false;
  const step = value as Record<string, unknown>;
  if (!STEP_ACTIONS.includes(step.action as (typeof STEP_ACTIONS)[number])) return false;
  switch (step.action) {
    case 'goto':
      return isNonEmptyString(step.path);
    case 'click':
    case 'highlight':
      return isNonEmptyString(step.selector);
    case 'fill':
      return isNonEmptyString(step.selector) && typeof step.value === 'string';
    case 'scroll':
      return step.to === 'bottom' || step.to === 'top' || isFiniteNumber(step.to);
    case 'wait':
      return isFiniteNumber(step.ms) && step.ms >= 0;
    default:
      return false;
  }
}

function isDemoFlow(value: unknown): value is DemoFlow {
  if (typeof value !== 'object' || value === null) return false;
  const flow = value as Record<string, unknown>;
  const pip = flow.pip as Record<string, unknown> | undefined;
  const viewport = flow.viewport as Record<string, unknown> | undefined;
  return (
    isNonEmptyString(flow.id) &&
    isNonEmptyString(flow.title) &&
    (flow.purpose === 'lesson-walkthrough' ||
      flow.purpose === 'brand-broll' ||
      flow.purpose === 'marketing-reel') &&
    (flow.brandVideoScriptId === null || isNonEmptyString(flow.brandVideoScriptId)) &&
    (flow.auth === 'student' || flow.auth === 'guest') &&
    !!viewport &&
    isFiniteNumber(viewport.width) &&
    viewport.width > 0 &&
    isFiniteNumber(viewport.height) &&
    viewport.height > 0 &&
    !!pip &&
    (pip.corner === 'br' || pip.corner === 'bl' || pip.corner === 'tr' || pip.corner === 'tl') &&
    isFiniteNumber(pip.widthPct) &&
    pip.widthPct > 0 &&
    pip.widthPct <= 100 &&
    Array.isArray(flow.steps) &&
    flow.steps.every(isDemoStep) &&
    (flow.lessonId === undefined || isNonEmptyString(flow.lessonId))
  );
}

/** Runtime guard mirroring `isThumbnailBriefsFile` in the thumbnail tool. */
export function isDemoFlowsFile(value: unknown): value is DemoFlowsFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  if (file.version !== DEMO_FLOWS_VERSION) return false;
  if (!Array.isArray(file.flows)) return false;
  return file.flows.every(isDemoFlow);
}

/**
 * A flow is "ready to record" only when it has at least one step. The avatar pairing is
 * optional (silent b-roll is allowed), so it is not required here.
 */
export function isFlowRecordable(flow: DemoFlow): boolean {
  return Array.isArray(flow.steps) && flow.steps.length > 0;
}
