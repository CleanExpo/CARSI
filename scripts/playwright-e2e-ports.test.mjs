// The E2E web servers listen on E2E_PORT, E2E_PORT_2 and E2E_PORT_3 when they are set, and on
// 3000, 3100 and 3101 when they are not (UNI-3468). GitHub never sets them, so CI is unchanged.
// The release gate's local CI mirror sets them to free ports, because on a shared Mac another
// session's dev server often holds localhost:3000 and Playwright then refuses to start
// ("http://localhost:3000 is already used").
//
// Run: node --test scripts/playwright-e2e-ports.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = pathToFileURL(join(root, 'config', 'playwright.config.ts')).href;

// Load the config in a child so each case gets a fresh module and its own environment.
const PRINT = `const c = (await import(${JSON.stringify(config)})).default;
console.log(JSON.stringify({
  baseURL: c.use.baseURL,
  projects: c.projects.map((p) => [p.name, p.use?.baseURL ?? null]),
  servers: c.webServer.map((w) => ({ url: w.url, command: w.command, port: w.env?.PORT ?? null })),
}));`;

function load(env) {
  const base = { ...process.env };
  for (const k of Object.keys(base)) {
    if (k.startsWith('E2E_PORT') || k.startsWith('PLAYWRIGHT_') || k === 'CI' || k === 'PORT') delete base[k];
  }
  const r = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', PRINT], {
    cwd: root,
    env: { ...base, CI: '1', ...env },
    encoding: 'utf8',
    timeout: 60_000,
  });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

test('without E2E_PORT* the servers keep 3000, 3100 and 3101', () => {
  const c = load({});
  assert.equal(c.baseURL, 'http://localhost:3000');
  assert.deepEqual(
    c.servers.map((s) => s.url),
    ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3101'],
  );
  assert.equal(c.servers[0].port, '3000');
  assert.match(c.servers[1].command, /-p 3100$/);
  assert.match(c.servers[2].command, /-p 3101$/);
});

test('E2E_PORT, E2E_PORT_2 and E2E_PORT_3 move every server and base URL', () => {
  const c = load({ E2E_PORT: '45001', E2E_PORT_2: '45002', E2E_PORT_3: '45003' });
  assert.equal(c.baseURL, 'http://localhost:45001');
  assert.deepEqual(
    c.servers.map((s) => s.url),
    ['http://localhost:45001', 'http://localhost:45002', 'http://localhost:45003'],
  );
  assert.equal(c.servers[0].port, '45001');
  assert.match(c.servers[1].command, /-p 45002$/);
  assert.match(c.servers[2].command, /-p 45003$/);
  const byName = Object.fromEntries(c.projects);
  assert.equal(byName['membership-checkout'], 'http://localhost:45002');
  assert.equal(byName['purchase-survey'], 'http://localhost:45003');
});

// UNI-3472: a developer's own PORT is kept when E2E_PORT is unset, so the server and the URL
// Playwright waits on agree. E2E_PORT still wins when both are set.
test('a local PORT is kept for the main server when E2E_PORT is unset', () => {
  const c = load({ PORT: '4999' });
  assert.equal(c.baseURL, 'http://localhost:4999');
  assert.equal(c.servers[0].url, 'http://localhost:4999');
  assert.equal(c.servers[0].port, '4999');
  assert.equal(load({ PORT: '4999', E2E_PORT: '45001' }).servers[0].port, '45001');
});

test('an explicit PLAYWRIGHT_BASE_URL still wins over E2E_PORT', () => {
  const c = load({ E2E_PORT: '45001', PLAYWRIGHT_BASE_URL: 'http://localhost:4999' });
  assert.equal(c.baseURL, 'http://localhost:4999');
});
