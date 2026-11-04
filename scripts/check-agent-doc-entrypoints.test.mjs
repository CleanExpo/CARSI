#!/usr/bin/env node
/**
 * GP-680: the agent rule files moved from the repo root to docs/agents/ (GP-679 layout).
 * Claude Code only auto-loads ./CLAUDE.md or ./.claude/CLAUDE.md, and Cursor only
 * auto-loads ./AGENTS.md or .cursor/rules/*.mdc. After the move nothing at either
 * entry point named the new files, so agents started work WITHOUT the licence rules
 * (IICRC CEC terminology) or the Premium Visual & Motion Standard, and nothing failed.
 *
 * This test holds the pointers in place. It fails when:
 *   - an entry point is missing or not committed-able (git-ignored),
 *   - an entry point stops referencing docs/agents/AGENTS.md or docs/agents/CLAUDE.md,
 *   - a reference resolves to a file that does not exist,
 *   - the Cursor rule stops being alwaysApply,
 *   - the referenced files lose the rule sections the entry points exist to load.
 * Each failure mode is planted below in a throwaway fixture, so a pass on the real
 * repo cannot come from a check that is unable to fail.
 */
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

test('control: Cursor rule without alwaysApply: true fails', () => {
  const errs = errorsFor((d) => {
    const p = join(d, '.cursor/rules/carsi-agent-rules.mdc');
    writeFileSync(p, readFileSync(p, 'utf8').replace('alwaysApply: true', 'alwaysApply: false'));
  });
  assert.ok(
    errs.some((m) => /alwaysApply/.test(m)),
    errs.join('\n')
  );
});

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
