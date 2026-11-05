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

/** Drop indented code blocks: 4-space/tab lines that open after a blank line. */
function stripIndentedCode(text) {
  const out = [];
  let prevBlank = true;
  let inBlock = false;
  for (const line of text.split('\n')) {
    const indented = /^( {4}|\t)/.test(line);
    inBlock = indented && (inBlock || prevBlank);
    if (!inBlock) out.push(line);
    if (line.trim() !== '') prevBlank = false;
    else prevBlank = true;
  }
  return out.join('\n');
}

/** `@path` references outside fenced, indented and inline code. */
function references(text) {
  const prose = stripIndentedCode(text.replace(/```[\s\S]*?```/g, '')).replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/(?:^|\s)@([^\s`]+\.mdc?)\b/g)].map((m) => m[1]);
}

/** The leading `---` front matter block only (Cursor ignores later blocks). */
function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  return m ? m[1] : '';
}

/** Body of the heading whose text contains `marker`, up to the next heading of the same or higher level. */
function sectionBody(text, marker) {
  const lines = text.split('\n');
  const at = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.includes(marker));
  if (at < 0) return null;
  const level = /^#+/.exec(lines[at])[0].length;
  const body = [];
  for (const line of lines.slice(at + 1)) {
    const h = /^(#+)\s/.exec(line);
    if (h && h[1].length <= level) break;
    body.push(line);
  }
  return body
    .join('\n')
    .replace(/^-{3,}\s*$/gm, '')
    .trim();
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
    if (e.alwaysApply && !/^alwaysApply:\s*true\s*$/m.test(frontMatter(text))) {
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
    else {
      const body = sectionBody(readFileSync(abs, 'utf8'), doc.marker);
      if (body === null) {
        errors.push(`${doc.path} no longer contains the "${doc.marker}" section agents rely on`);
      } else if (body === '') {
        errors.push(`${doc.path} keeps the "${doc.marker}" heading but its section is empty`);
      }
    }
  }
  return errors;
}
