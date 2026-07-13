#!/usr/bin/env node
/**
 * Secret scanner for the pre-commit guard (CARSI issue #122).
 *
 * Scans STAGED ADDITIONS only for live-looking API key/secret tokens and
 * blocks the commit if any are found. Placeholders (ck_xxx, your_key, etc.)
 * are intentionally ignored.
 *
 * Modes:
 *   (default)  scan STAGED additions   — the local pre-commit guard.
 *   --all      scan the WHOLE tracked tree (empty-tree..HEAD) — the CI gate, so a
 *              committed secret fails the build even though the local hook was
 *              skipped or the staged diff is empty.
 *
 * Run manually: node scripts/check-secrets.mjs [--all]
 * Bypass (verified false positive): git commit --no-verify
 */
import { execSync } from 'node:child_process';

import { findSecretToken } from './secret-scan-core.mjs';

const scanAll = process.argv.includes('--all');

let diff = '';
try {
  let diffCmd;
  if (scanAll) {
    // Whole tracked tree: diff the empty tree against HEAD so every tracked line
    // is treated as an "addition" and runs through the same +added-line parser.
    const emptyTree = execSync('git hash-object -t tree /dev/null', { encoding: 'utf8' }).trim();
    diffCmd = `git diff --no-color -U0 ${emptyTree} HEAD`;
  } else {
    // Staged additions only, no context lines.
    diffCmd = 'git diff --cached --no-color -U0';
  }
  diff = execSync(diffCmd, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
} catch (err) {
  console.error('check-secrets: failed to read diff:', err.message);
  process.exit(1);
}

const findings = [];
let currentFile = null;

for (const line of diff.split('\n')) {
  // Track which file we're in.
  const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
  if (fileMatch) {
    currentFile = fileMatch[1];
    continue;
  }
  // Only added lines (not the +++ header).
  if (!line.startsWith('+') || line.startsWith('+++')) continue;

  const content = line.slice(1);
  const token = findSecretToken(content);
  if (token) {
    const masked = token.slice(0, 6) + '…' + token.slice(-4);
    findings.push(`  ${currentFile ?? '(unknown)'}: ${masked}`);
  }
}

if (findings.length > 0) {
  console.error(
    scanAll
      ? '\n✖ secret scan failed: possible secret(s) in the tracked tree (CARSI #122 guard)\n'
      : '\n✖ pre-commit blocked: possible secret(s) in staged changes (CARSI #122 guard)\n'
  );
  console.error(findings.join('\n'));
  console.error(
    '\nUse a placeholder (e.g. ck_xxx) for examples. If this is a verified' +
      '\nfalse positive, re-run with: git commit --no-verify\n'
  );
  process.exit(1);
}

process.exit(0);
