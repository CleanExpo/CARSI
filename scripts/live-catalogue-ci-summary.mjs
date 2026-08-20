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

  // The SHAPE is validated, never assumed. `violations` arriving as an object rather than an
  // array makes `.length` undefined — falsy — so every "did it find anything?" test below would
  // silently answer "no" and render a live breach as a clean run. `|| []` does not save this:
  // an object is truthy, so it passes straight through. The guard promises arrays on every exit
  // path (check-live-catalogue.mjs:496,574-575), so anything else is a broken guard, and a
  // broken guard must be loud rather than convenient.
  if (!Array.isArray(report.violations) || !Array.isArray(report.notes)) {
    lines.push(
      '🚨 **The audit report is malformed — `violations` and `notes` must both be arrays.**',
      '',
      `Received \`violations\`: ${describeShape(report.violations)} · \`notes\`: ${describeShape(report.notes)}.`,
      '',
      'This is a defect in the guard, not evidence of a clean catalogue. A report whose shape',
      'cannot be trusted cannot be read as "found nothing" — treat this run as "did not audit".',
      '',
      'Raw output (first 500 chars):',
      '',
      '```',
      String(raw).slice(0, 500) || '(empty)',
      '```',
    );
    return lines.join('\n');
  }

  const violations = report.violations;
  const notes = report.notes;

  if (exitCode === '0' && violations.length) {
    // The guard promises exit 1 whenever it finds anything, so exit 0 WITH violations means the
    // guard contradicted itself. Rendering "all clean" here would turn a broken licence guard
    // into a green tick — the exact equivalence between "found nothing" and "could not tell"
    // that this file exists to prevent. Say it out loud and show what it reported anyway.
    lines.push(
      `🚨 **The audit contradicted itself — it exited 0 (clean) while reporting ${violations.length} violation(s).**`,
      '',
      'This is a defect in the guard, not evidence of a clean catalogue. Treat this run as "did',
      'not audit": the exit code cannot be read as a pass when the report disagrees with it.',
      '',
      `Site: ${report.site} · ${report.checked} live courses checked`,
      '',
      'What it reported despite exiting clean:',
      '',
    );
    for (const v of violations) lines.push(...violationLines(v));
  } else if (exitCode === '0') {
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

// Names the shape that arrived, so a malformed report is diagnosable from the summary alone
// rather than needing the raw artefact re-fetched from a run that may already be expired.
function describeShape(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (value === undefined) return 'missing';
  return typeof value;
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
