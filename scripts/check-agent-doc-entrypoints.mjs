/**
 * GP-680: agent entry points must load the rule files in docs/agents/.
 * See check-agent-doc-entrypoints.test.mjs for why this exists.
 *
 * Claude Code reads .claude/CLAUDE.md and follows `@path` imports relative to that file.
 * Codex reads ./AGENTS.md; its `@path` references are written relative to the repo root.
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
  { path: 'AGENTS.md', agent: 'Codex', base: 'root' },
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

/**
 * GP-692: blank out HTML comments and fenced code blocks, keeping the line count. A fence
 * opens with 3+ backticks or tildes (up to 3 spaces in) and closes only on a line of the SAME
 * character at least as long; an unclosed fence or comment runs to the end of the file. A rule
 * hidden in either is not loaded by the agent, so it must not count as present here.
 */
function stripHidden(text) {
  const out = [];
  let fence = null;
  let comment = false;
  for (const line of text.split('\n')) {
    if (fence) {
      if (fence.test(line)) fence = null;
      out.push('');
      continue;
    }
    let rest = line;
    let kept = '';
    if (!comment) {
      const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
        fence = new RegExp(`^ {0,3}${open[1][0]}{${open[1].length},}[ \\t]*$`);
        out.push('');
        continue;
      }
    }
    for (;;) {
      if (comment) {
        const end = rest.indexOf('-->');
        if (end < 0) break;
        comment = false;
        rest = rest.slice(end + 3);
      } else {
        const start = rest.indexOf('<!--');
        if (start < 0) {
          kept += rest;
          break;
        }
        kept += rest.slice(0, start);
        comment = true;
        rest = rest.slice(start + 4);
      }
    }
    out.push(kept);
  }
  return out.join('\n');
}

/** `@path` references outside comments and fenced, indented and inline code. */
function references(text) {
  const prose = stripIndentedCode(stripHidden(text)).replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/(?:^|\s)@([^\s`]+\.mdc?)\b/g)].map((m) => m[1]);
}

/** Body of the heading whose text contains `marker`, up to the next heading of the same or higher level; comments and fenced code are ignored. */
function sectionBody(text, marker) {
  const lines = stripHidden(text).split('\n');
  const at = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.includes(marker));
  if (at < 0) return null;
  const level = /^#+/.exec(lines[at])[0].length;
  const body = [];
  for (const line of lines.slice(at + 1)) {
    const h = /^(#+)\s/.exec(line);
    if (h && h[1].length <= level) break;
    body.push(line);
  }
  // A section holding only nested headings or thematic breaks (---, ***, ___) is empty.
  return body
    .filter((l) => !/^#{1,6}(\s|$)/.test(l) && !/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(l))
    .join('\n')
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
