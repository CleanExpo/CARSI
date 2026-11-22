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

const ATX_HEADING = /^ {0,3}#{1,6}(\s|$)/;

/** A fence opener (3+ backticks or tildes, up to 3 spaces in), or null. */
function fenceOpen(line) {
  const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  return open && !(open[1][0] === '`' && open[2].includes('`')) ? open : null;
}

/**
 * A line that ends the paragraph before it, so no code span continues onto it: a blank line, a
 * fence, an ATX heading, an HTML comment block, a thematic break or setext underline, or a bullet
 * item. Anything not listed here is read as paragraph continuation, which can only hide more.
 */
function endsParagraph(line) {
  return (
    line.trim() === '' ||
    fenceOpen(line) !== null ||
    ATX_HEADING.test(line) ||
    /^ {0,3}<!--/.test(line) ||
    /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(line) ||
    /^ {0,3}=+[ \t]*$/.test(line) ||
    /^ {0,3}[-+*][ \t]/.test(line)
  );
}

/** Start of the first backtick run of exactly `n` in `s` at or after `from`, or -1. */
function backtickRun(s, from, n) {
  for (let i = s.indexOf('`', from); i >= 0;) {
    let k = i;
    while (s[k] === '`') k += 1;
    if (k - i === n) return i;
    i = s.indexOf('`', k);
  }
  return -1;
}

/**
 * CodeRabbit on #1192: blank every inline code span, across lines, keeping the line count and
 * every newline. Per CommonMark a run of N backticks opens a span that the next run of exactly N
 * closes, possibly on a later line of the same paragraph; a run with no such closer is literal.
 * Spans are not looked for in fenced or indented code or inside HTML comments, and do not cross
 * a paragraph end (see endsParagraph). Span characters become `x`, not spaces, so a blanked line
 * is never mistaken for a blank line, an indent, a fence or a heading. The comment and fence
 * state here mirrors stripHidden, which runs on this output.
 */
function blankCodeSpans(text) {
  const lines = text.split('\n');
  const out = lines.map((l) => l.split(''));
  let fence = null;
  let comment = false;
  let prevBlank = true;
  let inIndented = false;
  let li = 0;
  let col = 0;
  let fresh = true;
  outer: while (li < lines.length) {
    const line = lines[li];
    if (fresh) {
      const blank = line.trim() === '';
      if (fence) {
        if (fence.test(line)) fence = null;
        prevBlank = blank;
        inIndented = false;
        li += 1;
        continue;
      }
      inIndented = !comment && /^( {4}|\t)/.test(line) && (inIndented || prevBlank);
      prevBlank = blank;
      if (inIndented) {
        li += 1;
        continue;
      }
      const open = comment ? null : fenceOpen(line);
      if (open) {
        fence = new RegExp(`^ {0,3}${open[1][0]}{${open[1].length},}[ \\t]*$`);
        li += 1;
        continue;
      }
    }
    let i = col;
    while (i < line.length) {
      if (comment) {
        const end = line.indexOf('-->', i);
        if (end < 0) break;
        comment = false;
        i = end + 3;
      } else if (line.startsWith('<!--', i)) {
        comment = true;
        i += 4;
      } else if (line[i] === '\\' && line[i + 1] === '`') {
        i += 2;
      } else if (line[i] !== '`') {
        i += 1;
      } else {
        let n = 1;
        while (line[i + n] === '`') n += 1;
        // Find the closer on this line, else on the following lines of the same paragraph.
        let k = li;
        let at = backtickRun(line, i + n, n);
        if (at < 0 && !ATX_HEADING.test(line)) {
          for (k = li + 1; k < lines.length && !endsParagraph(lines[k]); k += 1) {
            at = backtickRun(lines[k], 0, n);
            if (at >= 0) break;
          }
        }
        if (at < 0) {
          i += n;
          continue;
        }
        for (let r = li; r <= k; r += 1) {
          const from = r === li ? i : 0;
          const to = r === k ? at + n : lines[r].length;
          for (let c = from; c < to; c += 1) out[r][c] = 'x';
        }
        if (k === li) {
          i = at + n;
          continue;
        }
        // The span ended on a later line: carry on scanning that line after the closer.
        li = k;
        col = at + n;
        fresh = false;
        prevBlank = false;
        inIndented = false;
        continue outer;
      }
    }
    li += 1;
    col = 0;
    fresh = true;
  }
  return out.map((l) => l.join('')).join('\n');
}

/**
 * GP-692: blank out HTML comments and fenced code blocks, keeping the line count. A fence
 * opens with 3+ backticks or tildes (up to 3 spaces in) and closes only on a line of the SAME
 * character at least as long; an unclosed fence or comment runs to the end of the file. A rule
 * hidden in either is not loaded by the agent, so it must not count as present here.
 * CR and CRLF line endings are read as LF (CodeRabbit on #1192). Code spans are blanked first
 * (blankCodeSpans), so a `<!--` inside one, even one spanning lines, opens nothing; a `<!--` in an
 * indented code block is literal text too.
 */
function stripHidden(text) {
  const out = [];
  let fence = null;
  let comment = false;
  let prevBlank = true;
  let inIndented = false;
  for (const line of blankCodeSpans(text.replace(/\r\n?/g, '\n')).split('\n')) {
    const blank = line.trim() === '';
    if (fence) {
      if (fence.test(line)) fence = null;
      out.push('');
      prevBlank = blank;
      inIndented = false;
      continue;
    }
    // Indented code (4 spaces or a tab, opened after a blank line) is literal, so it can open
    // neither a fence nor a comment. stripIndentedCode drops it later for import lookup.
    inIndented = !comment && /^( {4}|\t)/.test(line) && (inIndented || prevBlank);
    prevBlank = blank;
    if (inIndented) {
      out.push(line);
      continue;
    }
    let rest = line;
    let kept = '';
    if (!comment) {
      const open = fenceOpen(line);
      if (open) {
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

/** `@path` references outside comments and fenced, indented and inline code (one line or many). */
function references(text) {
  const prose = stripIndentedCode(stripHidden(text));
  return [...prose.matchAll(/(?:^|\s)@([^\s`]+\.mdc?)\b/g)].map((m) => m[1]);
}

/** Body of the heading whose text contains `marker`, up to the next heading of the same or higher level; comments and fenced code are ignored. */
function sectionBody(text, marker) {
  const lines = stripHidden(text).split('\n');
  // An ATX heading may sit up to 3 spaces in (CodeRabbit on #1192).
  const at = lines.findIndex((l) => /^ {0,3}#{1,6}(\s|$)/.test(l) && l.includes(marker));
  if (at < 0) return null;
  const level = /^ {0,3}(#+)/.exec(lines[at])[1].length;
  const body = [];
  for (const line of lines.slice(at + 1)) {
    const h = /^ {0,3}(#{1,6})(\s|$)/.exec(line);
    if (h && h[1].length <= level) break;
    body.push(line);
  }
  // A section holding only nested headings or thematic breaks (---, ***, ___) is empty.
  return body
    .filter(
      (l) => !/^ {0,3}#{1,6}(\s|$)/.test(l) && !/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(l)
    )
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
