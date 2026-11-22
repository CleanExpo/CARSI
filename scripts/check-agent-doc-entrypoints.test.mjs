#!/usr/bin/env node
/**
 * GP-680: the agent rule files moved from the repo root to docs/agents/ (GP-679 layout).
 * Claude Code only auto-loads ./CLAUDE.md or ./.claude/CLAUDE.md, and Codex only
 * auto-loads ./AGENTS.md. After the move nothing at either
 * entry point named the new files, so agents started work WITHOUT the licence rules
 * (IICRC CEC terminology) or the Premium Visual & Motion Standard, and nothing failed.
 *
 * This test holds the pointers in place. It fails when:
 *   - an entry point is missing or not committed-able (git-ignored),
 *   - an entry point stops referencing docs/agents/AGENTS.md or docs/agents/CLAUDE.md,
 *   - a reference resolves to a file that does not exist,
 *   - the referenced files lose the rule sections the entry points exist to load.
 * Each failure mode is planted below in a throwaway fixture, so a pass on the real
 * repo cannot come from a check that is unable to fail.
 */
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAgentDocEntrypoints, ENTRYPOINTS } from './check-agent-doc-entrypoints.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('real repo: every agent entry point loads the docs/agents rule files', () => {
  const errors = checkAgentDocEntrypoints(REPO);
  assert.deepEqual(errors, []);
});

// ---- negative controls on a copy of the real files ----

function fixture(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'gp680-'));
  const copy = (rel) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), readFileSync(join(REPO, rel)));
  };
  for (const e of ENTRYPOINTS) copy(e.path);
  copy('docs/agents/AGENTS.md');
  copy('docs/agents/CLAUDE.md');
  mutate?.(dir);
  return dir;
}
const notIgnored = () => false;

function errorsFor(mutate, opts = { isIgnored: notIgnored }) {
  const dir = fixture(mutate);
  try {
    return checkAgentDocEntrypoints(dir, opts);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('control: unmodified copy passes (fixture is faithful)', () => {
  assert.deepEqual(errorsFor(), []);
});

for (const e of ENTRYPOINTS) {
  test(`control: missing ${e.path} fails`, () => {
    const errs = errorsFor((d) => rmSync(join(d, e.path)));
    assert.ok(
      errs.some((m) => m.includes(e.path) && /missing/.test(m)),
      errs.join('\n')
    );
  });

  test(`control: ${e.path} pointing at the old root files fails`, () => {
    const errs = errorsFor((d) => {
      const p = join(d, e.path);
      writeFileSync(p, readFileSync(p, 'utf8').replaceAll('docs/agents/', ''));
    });
    assert.ok(
      errs.some((m) => m.includes(e.path)),
      errs.join('\n')
    );
  });

  test(`control: git-ignored ${e.path} fails`, () => {
    const errs = errorsFor(undefined, { isIgnored: (rel) => rel === e.path });
    assert.ok(
      errs.some((m) => m.includes(e.path) && /ignored/.test(m)),
      errs.join('\n')
    );
  });
}

test('control: referenced doc deleted fails', () => {
  const errs = errorsFor((d) => rmSync(join(d, 'docs/agents/CLAUDE.md')));
  assert.ok(
    errs.some((m) => m.includes('docs/agents/CLAUDE.md')),
    errs.join('\n')
  );
});

test('control: premium visual section removed from AGENTS.md fails', () => {
  const errs = errorsFor((d) => {
    const p = join(d, 'docs/agents/AGENTS.md');
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll('Premium Visual & Motion Standard', 'X'));
  });
  assert.ok(
    errs.some((m) => /Premium Visual/.test(m)),
    errs.join('\n')
  );
});

test('control: import inside an indented code block does not count', () => {
  const errs = errorsFor((d) => {
    const p = join(d, '.claude/CLAUDE.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        '@../docs/agents/CLAUDE.md',
        '\n    @../docs/agents/CLAUDE.md\n'
      )
    );
  });
  assert.ok(
    errs.some((m) => m.includes('.claude/CLAUDE.md') && m.includes('docs/agents/CLAUDE.md')),
    errs.join('\n')
  );
});

test('control: licence heading kept but its section body emptied fails', () => {
  const errs = errorsFor((d) => {
    const p = join(d, 'docs/agents/CLAUDE.md');
    const text = readFileSync(p, 'utf8');
    const start = text.indexOf('## IICRC CEC terminology');
    const bodyStart = text.indexOf('\n', start) + 1;
    const next = text.indexOf('\n## ', bodyStart);
    writeFileSync(p, text.slice(0, bodyStart) + '\n' + text.slice(next + 1));
  });
  assert.ok(
    errs.some((m) => /IICRC CEC terminology/.test(m) && /empty/.test(m)),
    errs.join('\n')
  );
});

test('control: default git check-ignore detects an ignored entry point', () => {
  const dir = fixture((d) => {
    spawnSync('git', ['init', '-q', d]);
    writeFileSync(join(d, '.gitignore'), '.claude/CLAUDE.md\n');
  });
  try {
    const errs = checkAgentDocEntrypoints(dir);
    assert.ok(
      errs.some((m) => m.includes('.claude/CLAUDE.md') && /ignored/.test(m)),
      errs.join('\n')
    );
    assert.ok(!errs.some((m) => m.startsWith('AGENTS.md ') && /ignored/.test(m)), errs.join('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('control: licence section removed from CLAUDE.md fails', () => {
  const errs = errorsFor((d) => {
    const p = join(d, 'docs/agents/CLAUDE.md');
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll('IICRC CEC terminology', 'X'));
  });
  assert.ok(
    errs.some((m) => /IICRC CEC terminology/.test(m)),
    errs.join('\n')
  );
});

// ---- GP-692: a rule hidden in Markdown the agent does not read must not count ----

function importHidden(wrap) {
  return errorsFor((d) => {
    const p = join(d, '.claude/CLAUDE.md');
    const text = readFileSync(p, 'utf8');
    writeFileSync(p, text.replace('@../docs/agents/CLAUDE.md', wrap('@../docs/agents/CLAUDE.md')));
  });
}
const importMissing = (errs) =>
  errs.some((m) => m.includes('.claude/CLAUDE.md') && m.includes('docs/agents/CLAUDE.md'));

for (const [name, wrap] of [
  ['a ~~~ fence', (r) => `~~~\n${r}\n~~~`],
  ['a ``` fence that a ~~~ line does not close', (r) => '```\n~~~\n' + r + '\n```'],
  ['a ```` fence that a shorter ``` line does not close', (r) => '````\n```\n' + r + '\n````'],
  ['an unclosed fence', (r) => '~~~\n' + r],
  ['an HTML comment on one line', (r) => `<!-- ${r} -->`],
  ['a multi-line HTML comment', (r) => `<!--\n${r}\n-->`],
  ['an unclosed HTML comment', (r) => `<!--\n${r}`],
]) {
  test(`control: import inside ${name} does not count`, () => {
    const errs = importHidden(wrap);
    assert.ok(importMissing(errs), errs.join('\n'));
  });
}

test('control: import after a closed comment and a closed ~~~ fence still counts', () => {
  const errs = importHidden((r) => `<!-- x -->\n~~~\ncode\n~~~\n${r}`);
  assert.ok(!importMissing(errs), errs.join('\n'));
});

/** Rewrite the licence section of docs/agents/CLAUDE.md: `fn(heading, body)` returns its new text. */
function licenceSection(fn) {
  return errorsFor((d) => {
    const p = join(d, 'docs/agents/CLAUDE.md');
    const text = readFileSync(p, 'utf8');
    const start = text.indexOf('## IICRC CEC terminology');
    const bodyStart = text.indexOf('\n', start) + 1;
    const next = text.indexOf('\n## ', bodyStart) + 1;
    const heading = text.slice(start, bodyStart);
    writeFileSync(
      p,
      text.slice(0, start) + fn(heading, text.slice(bodyStart, next)) + text.slice(next)
    );
  });
}
const licenceGone = (errs) => errs.some((m) => /IICRC CEC terminology/.test(m));

for (const [name, fn] of [
  ['the heading survives only inside a ~~~ fence', (h, b) => `~~~\n${h}${b}~~~\n`],
  ['the heading survives only inside a ``` fence', (h, b) => '```md\n' + h + b + '```\n'],
  ['the heading survives only inside an HTML comment', (h, b) => `<!--\n${h}${b}-->\n`],
  ['the section holds only a nested ### heading', (h) => `${h}\n### More\n\n`],
  ['the section holds only *** and ___ breaks', (h) => `${h}\n***\n\n___\n\n- - -\n`],
  ['the section body is only in a fence', (h) => `${h}\n~~~\nrule text\n~~~\n`],
  ['the section body is only in an HTML comment', (h, b) => `${h}<!--\n${b}-->\n`],
]) {
  test(`control: ${name} fails`, () => {
    const errs = licenceSection(fn);
    assert.ok(licenceGone(errs), errs.join('\n'));
  });
}

// ---- CodeRabbit on #1192: line endings, literal comment openers, indented headings ----

function rewrite(rel, fn) {
  return errorsFor((d) => {
    const p = join(d, rel);
    writeFileSync(p, fn(readFileSync(p, 'utf8')));
  });
}
const crlf = (t) => t.replace(/\r?\n/g, '\r\n');

test('control: a CRLF copy of the real files still passes', () => {
  const errs = errorsFor((d) => {
    for (const rel of [...ENTRYPOINTS.map((e) => e.path), 'docs/agents/CLAUDE.md']) {
      const p = join(d, rel);
      writeFileSync(p, crlf(readFileSync(p, 'utf8')));
    }
  });
  assert.deepEqual(errs, []);
});

for (const [name, eol] of [
  ['CRLF', '\r\n'],
  ['CR', '\r'],
]) {
  test(`control: import inside a ~~~ fence in a ${name} file does not count`, () => {
    const errs = rewrite('.claude/CLAUDE.md', (t) =>
      t
        .replace('@../docs/agents/CLAUDE.md', '~~~\n@../docs/agents/CLAUDE.md\n~~~')
        .replace(/\r?\n/g, eol)
    );
    assert.ok(importMissing(errs), errs.join('\n'));
  });
}

for (const [name, before] of [
  ['an inline code span', 'Use `<!--` to open a comment.\n\n'],
  ['a double-backtick code span', 'Write ``<!-- x`` and close it.\n\n'],
  ['an indented code block', '\n    <!-- example opener\n\n'],
]) {
  test(`control: a literal <!-- in ${name} does not hide the imports after it`, () => {
    const errs = rewrite('.claude/CLAUDE.md', (t) =>
      t.replace('Licence, course production', `${before}Licence, course production`)
    );
    assert.deepEqual(errs, []);
  });
}

test('control: a <!-- after an unmatched backtick still opens a comment', () => {
  const errs = importHidden((r) => `a stray \` then <!--\n${r}\n-->`);
  assert.ok(importMissing(errs), errs.join('\n'));
});

test('control: the section holds only an indented nested ### heading fails', () => {
  for (const pad of [' ', '  ', '   ']) {
    const errs = licenceSection((h) => `${h}\n${pad}### More\n\n`);
    assert.ok(licenceGone(errs), JSON.stringify(pad) + '\n' + errs.join('\n'));
  }
});

// ---- CodeRabbit on #1192: a code span can run over several lines of one paragraph ----

const importsMissing = (errs) =>
  ['docs/agents/CLAUDE.md', 'docs/agents/AGENTS.md'].every((doc) =>
    errs.some((m) => m.includes('.claude/CLAUDE.md') && m.includes(doc))
  );

test('control: imports inside a multi-line code span do not count', () => {
  const errs = rewrite('.claude/CLAUDE.md', (t) =>
    t
      .replace('@../docs/agents/CLAUDE.md', '')
      .replace(
        '@../docs/agents/AGENTS.md',
        'Example `first line\nmarker <!-- literal -->\n@../docs/agents/CLAUDE.md\n@../docs/agents/AGENTS.md\nlast line`.'
      )
  );
  assert.ok(importsMissing(errs), errs.join('\n'));
});

test('control: a <!-- inside a multi-line code span does not hide the imports after it', () => {
  const errs = rewrite('.claude/CLAUDE.md', (t) =>
    t.replace(
      'Licence, course production',
      'Use `literal\nas <!--` in an example.\n\nLicence, course production'
    )
  );
  assert.deepEqual(errs, []);
});

test('control: a <!-- that starts a line ends the paragraph, so it still opens a comment', () => {
  // CommonMark: a line starting with <!-- begins an HTML block, which interrupts the paragraph,
  // so the backtick before it closes nothing (marked lexes it the same way).
  const errs = rewrite('.claude/CLAUDE.md', (t) =>
    t.replace(
      'Licence, course production',
      'Use `literal\n<!--` in an example.\n\nLicence, course production'
    )
  );
  assert.ok(importsMissing(errs), errs.join('\n'));
});

for (const [name, wrap] of [
  ['after an unmatched backtick', (r) => `a stray \` here\n${r}\nmore text`],
  ['after a `` run that only a ` run follows', (r) => `opens \`\` here\n${r}\ncloses \` only`],
  [
    'after a backtick whose match is past a blank line',
    (r) => `starts \`here\n\n${r}\nends here\``,
  ],
  ['after a multi-line span that closed earlier', (r) => `Example \`first\nline\` then\n${r}`],
  ['after an escaped backtick', (r) => `a \\\` here\n${r}\nand \` there`],
]) {
  test(`control: an import ${name} still counts`, () => {
    const errs = importHidden(wrap);
    assert.ok(!importMissing(errs), errs.join('\n'));
  });
}
