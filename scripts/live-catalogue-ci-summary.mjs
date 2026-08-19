#!/usr/bin/env node
/**
 * Render the live-catalogue audit as a GitHub step summary.
 *
 * Annotation ONLY. It never decides pass or fail — the workflow does that from the guard's
 * exit code, before this runs. Keeping the decision out of here means no future edit to the
 * prose can accidentally create a suppression path.
 *
 * It is a separate, tested script rather than inline YAML because a summary that renders
 * nothing is indistinguishable from a clean run, and untestable YAML is where that happens.
 * Every failure to read or parse the report is therefore SAID OUT LOUD in the summary.
 *
 * Usage: node scripts/live-catalogue-ci-summary.mjs <audit.json> <exit-code>
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Live courses known to be in breach, tracked in BACKLOG #31. Their course data is edited
 * through the admin session, not this repo, so no code change can clear them.
 *
 * This list ANNOTATES; it never suppresses. A course named here still fails the job. It
 * exists so a human reading a red run can tell "the four we already know about" from "a new
 * one appeared today" in one glance — the difference between an alarm they can triage and an
 * alarm they learn to ignore. If it ever became a filter it would be the same defect that let
 * unapproved CEC hours reach 22 courses.
 */
export const KNOWN_IN_BREACH = new Set([
  'cct-commercial-carpet-core',
  'wrt-water-damage-essentials',
  'fsrt-fire-smoke-restoration-core',
  'asd-structural-drying-core',
]);

export function renderSummary(raw, exitCode) {
  const lines = ['## Live catalogue licence audit', ''];

  let report;
  try {
    report = JSON.parse(raw);
  } catch (err) {
    // The guard promises one parseable object on every exit path, so this means the guard
    // itself is broken. Say so; do not render an empty summary that reads like a clean run.
    lines.push(
      `⚠️ **The audit report could not be parsed** — \`${err.message}\`.`,
      '',
      'The guard promises one parseable JSON object on every exit path, so this is a defect in',
      'the guard, not in the catalogue. Treat this run as "did not audit".',
      '',
      `Raw output (first 500 chars):`,
      '',
      '```',
      String(raw).slice(0, 500) || '(empty)',
      '```',
    );
    return lines.join('\n');
  }

  const violations = report.violations || [];
  const notes = report.notes || [];

  if (exitCode === '0') {
    lines.push(`✅ **${report.checked} live courses checked, all clean.**`, '', `Site: ${report.site}`);
  } else if (exitCode === '1') {
    const fresh = violations.filter((v) => !KNOWN_IN_BREACH.has(v.slug));
    const known = violations.filter((v) => KNOWN_IN_BREACH.has(v.slug));
    lines.push(
      `❌ **${violations.length} live course(s) carry banned IICRC discipline branding.**`,
      '',
      `Site: ${report.site} · ${report.checked} live courses checked`,
      '',
    );
    if (fresh.length) {
      lines.push(
        `### 🚨 ${fresh.length} NEW — not previously tracked`,
        '',
        'These appeared since BACKLOG #31 was written. A new live licence breach is the most',
        'urgent thing in this report.',
        '',
      );
      for (const v of fresh) lines.push(...violationLines(v));
    }
    if (known.length) {
      lines.push(
        `### ${known.length} already tracked in BACKLOG #31`,
        '',
        'Known and unfixed. Course data is edited through the admin session, not this repo, so',
        'clearing these needs the prod-DB path (DECISIONS #16) — not a code change.',
        '',
      );
      for (const v of known) lines.push(...violationLines(v));
    }
  } else if (exitCode === '2') {
    lines.push(
      '⚠️ **The catalogue could not be audited. This is NOT a pass.**',
      '',
      `Reason: ${report.error || '(the guard reported no reason, which is itself a defect)'}`,
      '',
      `Site: ${report.site} · ${report.checked} live courses checked`,
      '',
      'A guard that reached nothing has not checked anything. Nothing about the licence status',
      'of the live catalogue can be concluded from this run.',
    );
  } else {
    lines.push(
      `⚠️ **The guard exited with an unexpected code \`${exitCode}\`.**`,
      '',
      'Expected 0 (clean), 1 (violations) or 2 (could not audit). Treat as "did not audit".',
    );
  }

  if (notes.length) {
    lines.push(
      '',
      `### ${notes.length} audience-wording note(s) — review, does not block`,
      '',
      'A designation phrase used to describe who a course is FOR, rather than to brand it.',
      'Reported so it is never silently dropped; a human decides.',
      '',
    );
    for (const n of notes) lines.push(...violationLines(n));
  }

  return lines.join('\n');
}

function violationLines(course) {
  const hits = (course.hits || []).map((h) => `\`${h.rule}\`: ${h.detail}`).join(' · ');
  return [`- **${course.slug}** — ${course.title || '(no title)'}`, `  - ${hits}`, `  - ${course.url}`, ''];
}

// pathToFileURL, never `file://` + the raw path: an unencoded space makes the comparison
// false and silently disables the script. That defect shipped in three guards in this repo.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, exitCode] = process.argv.slice(2);
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (err) {
    raw = '';
    console.log(`## Live catalogue licence audit\n\n⚠️ **Could not read \`${file}\`** — ${err.message}.`);
    process.exit(0);
  }
  console.log(renderSummary(raw, String(exitCode)));
}
