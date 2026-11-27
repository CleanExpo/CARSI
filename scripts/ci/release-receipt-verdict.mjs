#!/usr/bin/env node
// Reads the Codex review verdict JSON written by `codex exec review --output-schema`
// and decides the nexus/release-receipt state. Fail-closed: anything that is not a
// well-formed PASS with zero P0/P1 findings is a failure.
//
// Usage: node scripts/ci/release-receipt-verdict.mjs <verdict.json>
// Prints one line: `success|<description>` or `failure|<description>`. Exit 0 on
// success, 1 on failure, so the workflow can branch on either.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BLOCKING = new Set(['P0', 'P1']);

export function decide(raw) {
  let v;
  try {
    v = JSON.parse(raw);
  } catch {
    return { state: 'failure', description: 'Codex verdict was not valid JSON' };
  }
  if (!v || typeof v !== 'object') {
    return { state: 'failure', description: 'Codex verdict was empty' };
  }
  const findings = Array.isArray(v.findings) ? v.findings : null;
  if (!findings) return { state: 'failure', description: 'Codex verdict had no findings list' };
  const blocking = findings.filter((f) => f && BLOCKING.has(String(f.severity).toUpperCase()));
  if (blocking.length > 0) {
    const first = String(blocking[0].title ?? 'unnamed finding').slice(0, 80);
    return {
      state: 'failure',
      description: `BLOCK reviewer=codex ${blocking.length} P0/P1: ${first}`,
    };
  }
  if (v.verdict !== 'PASS') {
    return {
      state: 'failure',
      description: `Codex verdict was ${String(v.verdict).slice(0, 20)}, not PASS`,
    };
  }
  return { state: 'success', description: `PASS reviewer=codex ci findings=${findings.length}` };
}

export const COMMENT_MARKER = '<!-- nexus-release-receipt -->';

// The PR comment the MacBook receipt runner reads to fix a blocked PR.
export function renderComment(raw, sha, runUrl) {
  const { state, description } = decide(raw);
  let findings = [];
  let summary = '';
  try {
    const v = JSON.parse(raw);
    findings = Array.isArray(v?.findings) ? v.findings : [];
    summary = typeof v?.summary === 'string' ? v.summary : '';
  } catch {
    /* decide() already reported the parse failure */
  }
  const clean = (s) =>
    String(s ?? '')
      .replace(/\|/g, '\\|')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);
  const lines = [
    COMMENT_MARKER,
    state === 'success'
      ? `### Release receipt: PASS on \`${String(sha).slice(0, 12)}\``
      : `### Release receipt: BLOCKED on \`${String(sha).slice(0, 12)}\``,
    '',
    state === 'success'
      ? 'The earlier blocking findings are resolved. This PR has its receipt.'
      : `${clean(description)}. Fix the P0/P1 findings below and push; the review re-runs on the new commit.`,
  ];
  if (summary) lines.push('', `**Codex summary:** ${clean(summary)}`);
  if (findings.length) {
    lines.push('', '| Severity | Finding | File |', '| --- | --- | --- |');
    for (const f of findings)
      lines.push(`| ${clean(f?.severity)} | ${clean(f?.title)} | ${clean(f?.file)} |`);
  }
  lines.push('', `[Review run](${runUrl})`);
  return lines.join('\n');
}

if (
  import.meta.url === pathToFileURL(process.argv[1] ?? '').href &&
  process.argv[2] === '--comment'
) {
  const [, , , file, sha, runUrl] = process.argv;
  let raw = '';
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    raw = '';
  }
  process.stdout.write(renderComment(raw, sha, runUrl) + '\n');
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const file = process.argv[2];
  let raw = '';
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    raw = '';
  }
  const { state, description } = decide(raw);
  process.stdout.write(`${state}|${description.slice(0, 140)}\n`);
  process.exit(state === 'success' ? 0 : 1);
}
