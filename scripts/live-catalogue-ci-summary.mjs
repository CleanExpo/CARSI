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
      shown(raw).slice(0, 500) || '(empty)',
      '```',
    );
    return lines.join('\n');
  }

  // A root that is not a plain object cannot carry `violations` or `notes` at all, and reaching
  // for them is how this renderer DIES instead of reporting. `JSON.parse('null')` succeeds and
  // `typeof null === 'object'`, so the array checks below are never reached — the summary throws
  // and the human is left with a stack trace where the guard defect should have been. A guard
  // that crashes instead of reporting is still a guard that did not report.
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    pushMalformed(
      lines,
      '🚨 **The audit report is malformed — the top level must be a JSON object.**',
      `Received: ${describeShape(report)}.`,
      raw,
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
    pushMalformed(
      lines,
      '🚨 **The audit report is malformed — `violations` and `notes` must both be arrays.**',
      `Received \`violations\`: ${describeShape(report.violations)} · \`notes\`: ${describeShape(report.notes)}.`,
      raw,
    );
    return lines.join('\n');
  }

  const violations = report.violations;
  const notes = report.notes;

  // Right container, wrong contents. Every entry is dereferenced downstream — `v.slug` in the
  // NEW-versus-known split, `course.hits` when rendered — so a single null or primitive entry
  // throws mid-render, and it throws precisely when there IS a breach to report. Checked up
  // front so a malformed entry is NAMED rather than fatal.
  const entries = [...violations, ...notes];
  const badIndex = entries.findIndex(
    (entry) => entry === null || typeof entry !== 'object' || Array.isArray(entry),
  );
  if (badIndex !== -1) {
    pushMalformed(
      lines,
      '🚨 **The audit report is malformed — every `violations` and `notes` entry must be an object.**',
      `Received an entry of shape: ${describeShape(entries[badIndex])}.`,
      raw,
    );
    return lines.join('\n');
  }

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
      `Site: ${shown(report.site)} · ${shown(report.checked)} live courses checked`,
      '',
      'What it reported despite exiting clean:',
      '',
    );
    for (const v of violations) lines.push(...violationLines(v));
  } else if (exitCode === '0') {
    lines.push(
      `✅ **${shown(report.checked)} live courses checked, all clean.**`,
      '',
      `Site: ${shown(report.site)}`,
    );
  } else if (exitCode === '1') {
    const fresh = violations.filter((v) => !KNOWN_IN_BREACH.has(v.slug));
    const known = violations.filter((v) => KNOWN_IN_BREACH.has(v.slug));
    lines.push(
      `❌ **${violations.length} live course(s) carry banned IICRC discipline branding.**`,
      '',
      `Site: ${shown(report.site)} · ${shown(report.checked)} live courses checked`,
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
      `Reason: ${shown(report.error || '(the guard reported no reason, which is itself a defect)')}`,
      '',
      `Site: ${shown(report.site)} · ${shown(report.checked)} live courses checked`,
      '',
      'A guard that reached nothing has not checked anything. Nothing about the licence status',
      'of the live catalogue can be concluded from this run.',
    );
  } else {
    lines.push(
      `⚠️ **The guard exited with an unexpected code \`${shown(exitCode)}\`.**`,
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

// EVERY report-derived value reaches the summary through here, and the property that matters is
// TOTALITY: this cannot throw on any JSON-representable value, because it branches on `typeof`
// and never calls a method on the value it was given.
//
// Template interpolation does call one — `toString` — so `${x}` on `{"toString": null}` throws
// "Cannot convert object to primitive value", killing the render. Four separate crashes in this
// file have now been the same mistake at four different depths: the root, the entry, the `hits`
// field, and the scalar fields. Guarding them one at a time is what kept producing the next one,
// so the guard is applied to the whole class instead of to the member that was found.
//
// `String()` only ever touches primitives here; objects, arrays, null and undefined all route to
// `describeShape`, which is itself typeof-only. JSON cannot produce symbols or BigInts, so this
// is total over everything the guard can emit.
// Absent is not the same as broken, and the distinction is the one already ratified for entries:
// a field that is simply not there is reported as missing, not accused of being malformed.
function shown(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '(missing)';
  return `(malformed: ${describeShape(value)})`;
}

// One voice for every shape complaint. Shared deliberately: three separate copies of this block
// is how one of them eventually ships quieter than its neighbours, and a quiet malformed-report
// message is the failure this file exists to prevent.
function pushMalformed(lines, headline, received, raw) {
  lines.push(
    headline,
    '',
    received,
    '',
    'This is a defect in the guard, not evidence of a clean catalogue. A report whose shape',
    'cannot be trusted cannot be read as "found nothing" — treat this run as "did not audit".',
    '',
    'Raw output (first 500 chars):',
    '',
    '```',
    shown(raw).slice(0, 500) || '(empty)',
    '```',
  );
}

// Names the shape that arrived, so a malformed report is diagnosable from the summary alone
// rather than needing the raw artefact re-fetched from a run that may already be expired.
function describeShape(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (value === undefined) return 'missing';
  return typeof value;
}

// `hits` is a FIELD of an otherwise-valid entry, so the entry check upstream cannot catch a bad
// one — and `.map` on a non-array throws, which would kill the render of every OTHER breach in
// the same report. `|| []` does not save this, for the identical reason it did not save the
// round-2 defect: a non-array object is truthy and passes straight through.
//
// A malformed `hits` is therefore NAMED here rather than thrown, and rendering continues. This
// deliberately differs from the entry check, which routes a bad entry to the loud malformed
// branch: nothing can be rendered from a null entry, whereas a course with a broken `hits` still
// has a slug and a URL, and those are the actionable part. Suppressing a real breach because the
// reason for it arrived in the wrong shape would be the same defect this file exists to prevent.
function violationLines(course) {
  // Only a TRUTHY non-array throws: `undefined`, `null` and the other falsy values fall through
  // `|| []` to an empty list, exactly as before, and are left alone. An absent `hits` is a field
  // that is missing, not a shape that is broken — the same distinction that keeps
  // `violations: [{}]` an accepted entry rather than a malformed report.
  const given = course.hits || [];
  const hits = Array.isArray(given)
    ? given
        .map((h) =>
          h === null || typeof h !== 'object'
            ? `⚠️ (malformed hit: ${describeShape(h)})`
            : `\`${shown(h.rule)}\`: ${shown(h.detail)}`,
        )
        .join(' · ')
    : `⚠️ malformed \`hits\` (${describeShape(course.hits)}) — the guard reported this course but not why`;
  return [
    `- **${shown(course.slug)}** — ${shown(course.title || '(no title)')}`,
    `  - ${hits}`,
    `  - ${shown(course.url)}`,
    '',
  ];
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
