import { prisma } from '@/lib/prisma';
import { resolveAnthropicConfig } from '@/lib/server/anthropic-client';
import { isEmailConfigured, sendEmail } from '@/lib/server/email';
import {
  optimizeAndApplyCourse,
  OptimizeCourseError,
  paidCourseNeedsOptimize,
} from '@/lib/server/optimize-course-content';

export const OPTIMIZE_CRON_EMAIL = 'ranamuzamil1199@gmail.com';

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
  results: OptimizeCronRow[];
};

function parseLimit(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 5);
}

export function parseOptimizeCronSearch(url: URL): { limit: number } {
  return { limit: parseLimit(url.searchParams.get('limit')) };
}

export function buildOptimizeCronEmail(result: OptimizeCronResult): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Course optimisation: ${result.updated} updated, ${result.failed} failed`;
  const lines = [
    'Paid course optimisation summary',
    '',
    `Paid courses processed: ${result.processed}`,
    `Successfully updated: ${result.updated}`,
    `Skipped (free, already done, or unchanged): ${result.skipped}`,
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
  const html = `<p>Paid course optimisation summary</p>
<ul>
<li>Paid courses processed: ${result.processed}</li>
<li>Successfully updated: ${result.updated}</li>
<li>Skipped (free, already done, or unchanged): ${result.skipped}</li>
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
}): Promise<OptimizeCronResult> {
  if (!resolveAnthropicConfig().configured) {
    throw new OptimizeCourseError('ANTHROPIC_API_KEY is not configured', 503);
  }

  const limit = opts?.limit ?? 1;
  const courses = await prisma.lmsCourse.findMany({
    orderBy: { updatedAt: 'asc' },
    select: { id: true, title: true, meta: true, isFree: true, updatedAt: true },
  });

  const paid = courses.filter((c) => !c.isFree);
  const pending = paid.filter((c) =>
    paidCourseNeedsOptimize({ isFree: c.isFree, updatedAt: c.updatedAt, meta: c.meta })
  );
  const batch = pending.slice(0, limit);
  const results: OptimizeCronRow[] = [];

  for (const course of batch) {
    try {
      results.push(await optimizeAndApplyCourse(course.id));
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
