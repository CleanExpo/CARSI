import { prisma } from '@/lib/prisma';
import { resolveAnthropicConfig } from '@/lib/server/anthropic-client';
import { isEmailConfigured, sendEmail } from '@/lib/server/email';
import {
  freeCourseNeedsOptimize,
  optimizeAndApplyCourse,
  OptimizeCourseError,
  paidCourseNeedsOptimize,
} from '@/lib/server/optimize-course-content';

export const OPTIMIZE_CRON_EMAIL = 'ranamuzamil1199@gmail.com';

export type OptimizeCronScope = 'paid' | 'free';

export type OptimizeCronRow = {
  courseId: string;
  title: string;
  previousModuleCount?: number;
  moduleCount?: number;
  summary?: string;
  error?: string;
};

export type OptimizeCronResult = {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  remaining: number;
  scope: OptimizeCronScope;
  results: OptimizeCronRow[];
};

function parseLimit(raw: string | null): number | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.min(n, 200);
}

export function parseOptimizeCronSearch(url: URL): { limit?: number; scope: OptimizeCronScope } {
  const limit = parseLimit(url.searchParams.get('limit'));
  const raw = url.searchParams.get('scope')?.trim().toLowerCase();
  const scope: OptimizeCronScope = raw === 'free' ? 'free' : 'paid';
  return limit == null ? { scope } : { limit, scope };
}

export function buildOptimizeCronEmail(result: OptimizeCronResult): {
  subject: string;
  text: string;
  html: string;
} {
  const paid = result.scope !== 'free';
  const label = paid ? 'Paid' : 'Free';
  const skippedHint = paid
    ? 'Skipped (free, already done, or unchanged)'
    : 'Skipped (paid, already done, or unchanged)';
  const subject = `${label} course optimisation: ${result.updated} updated, ${result.failed} failed`;
  const lines = [
    `${label} course optimisation summary`,
    '',
    `${label} courses processed: ${result.processed}`,
    `Successfully updated: ${result.updated}`,
    `${skippedHint}: ${result.skipped}`,
    `Failed: ${result.failed}`,
    `Still waiting: ${result.remaining}`,
    '',
  ];
  for (const row of result.results) {
    if (row.error) {
      lines.push(`FAILED ${row.title}: ${row.error}`);
      continue;
    }
    lines.push(
      `UPDATED ${row.title}: ${row.previousModuleCount ?? '?'} modules -> ${row.moduleCount ?? '?'} modules. ${row.summary ?? ''}`
    );
  }
  const text = lines.join('\n');
  const html = `<p>${label} course optimisation summary</p>
<ul>
<li>${label} courses processed: ${result.processed}</li>
<li>Successfully updated: ${result.updated}</li>
<li>${escapeHtml(skippedHint)}: ${result.skipped}</li>
<li>Failed: ${result.failed}</li>
<li>Still waiting: ${result.remaining}</li>
</ul>
${result.results
  .map((row) =>
    row.error
      ? `<p><strong>FAILED</strong> ${escapeHtml(row.title)}: ${escapeHtml(row.error)}</p>`
      : `<p><strong>UPDATED</strong> ${escapeHtml(row.title)}: ${row.previousModuleCount ?? '?'} modules → ${row.moduleCount ?? '?'} modules. ${escapeHtml(row.summary ?? '')}</p>`
  )
  .join('\n')}`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function runOptimizeCoursesCron(opts?: {
  limit?: number;
  scope?: OptimizeCronScope;
}): Promise<OptimizeCronResult> {
  if (!resolveAnthropicConfig().configured) {
    throw new OptimizeCourseError('ANTHROPIC_API_KEY is not configured', 503);
  }

  const scope: OptimizeCronScope = opts?.scope === 'free' ? 'free' : 'paid';
  const courses = await prisma.lmsCourse.findMany({
    orderBy: { updatedAt: 'asc' },
    select: { id: true, title: true, meta: true, isFree: true, updatedAt: true },
  });

  const pool = courses.filter((c) => (scope === 'free' ? c.isFree : !c.isFree));
  const pending = pool.filter((c) =>
    scope === 'free'
      ? freeCourseNeedsOptimize({ isFree: c.isFree, updatedAt: c.updatedAt, meta: c.meta })
      : paidCourseNeedsOptimize({ isFree: c.isFree, updatedAt: c.updatedAt, meta: c.meta })
  );
  const batch = opts?.limit != null ? pending.slice(0, opts.limit) : pending;
  const results: OptimizeCronRow[] = [];
  const allowFree = scope === 'free';

  for (const [index, course] of batch.entries()) {
    console.info(
      `[cron/optimize-course-content] ${scope} ${index + 1}/${batch.length} ${course.title}`
    );
    try {
      results.push(await optimizeAndApplyCourse(course.id, { allowFree }));
    } catch (e) {
      results.push({
        courseId: course.id,
        title: course.title,
        error: e instanceof Error ? e.message : 'Optimize failed',
      });
    }
  }

  const updated = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;
  const result: OptimizeCronResult = {
    processed: batch.length,
    updated,
    skipped: courses.length - pending.length,
    failed,
    remaining: Math.max(0, pending.length - batch.length),
    scope,
    results,
  };

  if (batch.length > 0 && isEmailConfigured()) {
    const mail = buildOptimizeCronEmail(result);
    await sendEmail({
      to: OPTIMIZE_CRON_EMAIL,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  return result;
}

let backgroundRun: Promise<void> | null = null;

export function isOptimizeCronRunning(): boolean {
  return backgroundRun != null;
}

/** Starts the catalogue run without holding the HTTP request open (Cloudflare 524). */
export function startOptimizeCoursesCron(opts?: { limit?: number; scope?: OptimizeCronScope }): {
  started: boolean;
} {
  if (backgroundRun) return { started: false };
  const scope: OptimizeCronScope = opts?.scope === 'free' ? 'free' : 'paid';
  backgroundRun = runOptimizeCoursesCron({ ...opts, scope })
    .then((result) => {
      console.info('[cron/optimize-course-content] finished', {
        scope: result.scope,
        processed: result.processed,
        updated: result.updated,
        failed: result.failed,
        remaining: result.remaining,
      });
    })
    .catch((e) => {
      console.error('[cron/optimize-course-content] background failed', e);
    })
    .finally(() => {
      backgroundRun = null;
    });
  return { started: true };
}
