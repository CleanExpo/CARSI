/**
 * GP-680: agent entry points must load the rule files in docs/agents/.
 * See check-agent-doc-entrypoints.test.mjs for why this exists.
 *
 * Claude Code reads .claude/CLAUDE.md and follows `@path` imports relative to that file.
 * Cursor reads .cursor/rules/*.mdc and follows `@path` references relative to the repo root.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export const RULE_DOCS = [
  { path: 'docs/agents/AGENTS.md', marker: 'Premium Visual & Motion Standard' },
  { path: 'docs/agents/CLAUDE.md', marker: 'IICRC CEC terminology' },
];

export const ENTRYPOINTS = [
  { path: '.claude/CLAUDE.md', agent: 'Claude Code', base: 'file' },
  { path: '.cursor/rules/carsi-agent-rules.mdc', agent: 'Cursor', base: 'root', alwaysApply: true },
];

function gitIgnored(root) {
  return (rel) => {
    const r = spawnSync('git', ['-C', root, 'check-ignore', '-q', '--no-index', '--', rel]);
    if (r.status === 0) return true;
    if (r.status === 1) return false;
    throw new Error(
      `git check-ignore could not run for ${rel} (status ${r.status}); cannot verify`
    );
  };
}

/** `@path` references outside fenced and inline code. */
function references(text) {
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/(?:^|\s)@([^\s`]+\.mdc?)\b/g)].map((m) => m[1]);
}

export function checkAgentDocEntrypoints(root, { isIgnored = gitIgnored(root) } = {}) {
  const errors = [];
  for (const e of ENTRYPOINTS) {
    const abs = join(root, e.path);
    if (!existsSync(abs)) {
      errors.push(`${e.path} (${e.agent} entry point) is missing`);
      continue;
    }
    if (isIgnored(e.path))
      errors.push(`${e.path} is git-ignored, so it never reaches other machines`);
    const text = readFileSync(abs, 'utf8');
    if (e.alwaysApply && !/^---[\s\S]*?^alwaysApply:\s*true\s*$[\s\S]*?^---/m.test(text)) {
      errors.push(`${e.path} must set alwaysApply: true in its front matter`);
    }
    const base = e.base === 'file' ? dirname(abs) : root;
    const loaded = references(text).map((ref) => relative(root, resolve(base, ref)));
    for (const doc of RULE_DOCS) {
      if (!loaded.includes(doc.path)) errors.push(`${e.path} does not reference ${doc.path}`);
    }
  }
  for (const doc of RULE_DOCS) {
    const abs = join(root, doc.path);
    if (!existsSync(abs)) errors.push(`${doc.path} is missing`);
    else if (!readFileSync(abs, 'utf8').includes(doc.marker)) {
      errors.push(`${doc.path} no longer contains the "${doc.marker}" section agents rely on`);
    }
  }
  return errors;
}
