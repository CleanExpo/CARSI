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
