#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = join(fileURLToPath(new URL('.', import.meta.url)), 'sync-media-manifest.mjs');

const dir = mkdtempSync(join(tmpdir(), 'manifest-sync-'));
try {
  mkdirSync(join(dir, 'public', 'courses', 'x'), { recursive: true });
  mkdirSync(join(dir, 'config'), { recursive: true });
  writeFileSync(join(dir, 'public', 'courses', 'x', 'cover.webp'), 'x');
  writeFileSync(
    join(dir, 'config', 'media.manifest.json'),
    JSON.stringify({ version: 1, entries: [] }, null, 2)
  );
  const r = spawnSync(process.execPath, [script, '--write'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, MANIFEST_SYNC_ROOT: dir },
  });
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
  }
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const m = JSON.parse(readFileSync(join(dir, 'config/media.manifest.json'), 'utf8'));
  assert.ok(m.entries.some((e) => e.src === '/courses/x/cover.webp'));
  console.log('sync-media-manifest.test.mjs: ok');
} finally {
  rmSync(dir, { recursive: true, force: true });
}