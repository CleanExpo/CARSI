#!/usr/bin/env node
/**
 * Secret scanner for the pre-commit guard (CARSI issue #122).
 *
 * Scans STAGED ADDITIONS only for live-looking API key/secret tokens and
 * blocks the commit if any are found. Placeholders (ck_xxx, your_key, etc.)
 * are intentionally ignored.
 *
 * Run manually: node scripts/check-secrets.mjs
 * Bypass (verified false positive): git commit --no-verify
 */
import { execSync } from 'node:child_process';

// Live-key prefixes (Stripe/WooCommerce/webhook/restricted) + 16+ token chars.
const SECRET_RE = /(ck|cs|sk|pk|whsec|rk)_[A-Za-z0-9]{16,}/;

// Lines that look like placeholders/examples are not real secrets.
const PLACEHOLDER_RE = /xxx|your[_-]|example|redacted|placeholder|changeme|dummy|\.\.\.|<[^>]+>|\$\{/i;

let diff = '';
try {
  // Staged additions only, no context lines.
  diff = execSync('git diff --cached --no-color -U0', {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (err) {
  console.error('check-secrets: failed to read staged diff:', err.message);
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
  if (SECRET_RE.test(content) && !PLACEHOLDER_RE.test(content)) {
    const token = content.match(SECRET_RE)?.[0] ?? '';
    const masked = token.slice(0, 6) + '…' + token.slice(-4);
    findings.push(`  ${currentFile ?? '(unknown)'}: ${masked}`);
  }
}

if (findings.length > 0) {
  console.error('\n✖ pre-commit blocked: possible secret(s) in staged changes (CARSI #122 guard)\n');
  console.error(findings.join('\n'));
  console.error(
    '\nUse a placeholder (e.g. ck_xxx) for examples. If this is a verified' +
      '\nfalse positive, re-run with: git commit --no-verify\n'
  );
  process.exit(1);
}

process.exit(0);
