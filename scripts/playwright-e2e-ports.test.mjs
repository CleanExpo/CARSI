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
    if (k.startsWith('E2E_PORT') || k.startsWith('PLAYWRIGHT_') || k === 'CI' || k === 'PORT')
      delete base[k];
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
    ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3101']
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
    ['http://localhost:45001', 'http://localhost:45002', 'http://localhost:45003']
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

// A PORT equal to a default for another server must not put two servers on one port.
test('a local PORT equal to a default for another server moves that default aside', () => {
  const a = load({ PORT: '3100' }).servers.map((s) => s.url);
  assert.deepEqual(a, ['http://localhost:3100', 'http://localhost:3102', 'http://localhost:3101']);
  const b = load({ PORT: '3101' }).servers.map((s) => s.url);
  assert.deepEqual(b, ['http://localhost:3101', 'http://localhost:3100', 'http://localhost:3103']);
  // The survey fallback also avoids a main or membership port set explicitly to its candidates.
  const c = load({ PORT: '3103', E2E_PORT_2: '3101' }).servers.map((s) => s.url);
  assert.deepEqual(c, ['http://localhost:3103', 'http://localhost:3101', 'http://localhost:3105']);
  const d = load({ PORT: '3102', E2E_PORT_2: '3100' }).servers.map((s) => s.url);
  assert.deepEqual(d, ['http://localhost:3102', 'http://localhost:3100', 'http://localhost:3101']);
  // An explicit E2E_PORT_2 still wins, even when it matches nothing else.
  assert.equal(
    load({ PORT: '3100', E2E_PORT_2: '45002' }).servers[1].url,
    'http://localhost:45002'
  );
});

// The whole allocation, every kind of collision at once (UNI-3472: three review rounds each found
// another collision). One child process walks a grid of E2E_PORT, PORT, E2E_PORT_2 and E2E_PORT_3
// values, including every default port as an explicit value and as PORT. Every combination must
// either give three distinct ports (explicit values kept) or throw, and it must throw exactly
// when two explicit values, or an explicit value and the main port, are the same.
const GRID_SCRIPT = (href) => `const { allocateE2EPorts } = await import(${JSON.stringify(href)});
const vals = [undefined, '3000', '3100', '3101', '3102', '3103', '3104', '3105', '4999', '45002'];
const mains = [undefined, '3100', '4999'];
const bad = []; let n = 0, threw = 0;
for (const e2ePort of mains) for (const port of vals) for (const a of vals) for (const b of vals) {
  const env = {};
  if (e2ePort) env.E2E_PORT = e2ePort;
  if (port) env.PORT = port;
  if (a) env.E2E_PORT_2 = a;
  if (b) env.E2E_PORT_3 = b;
  const m = e2ePort ?? port ?? '3000';
  const collides = (a && a === m) || (b && b === m) || (a && b && a === b);
  n++;
  let r = null, error = null;
  try { r = allocateE2EPorts(env); } catch (e) { error = e; }
  if (collides) {
    threw++;
    if (!error) bad.push(['no-throw', e2ePort, port, a, b, r]);
    continue;
  }
  if (error) { bad.push(['threw', e2ePort, port, a, b, String(error)]); continue; }
  if (new Set([r.main, r.membership, r.survey]).size !== 3) bad.push(['dup', e2ePort, port, a, b, r]);
  if (r.main !== m) bad.push(['main', e2ePort, port, a, b, r]);
  if (a && r.membership !== a) bad.push(['explicit2 lost', e2ePort, port, a, b, r]);
  if (b && r.survey !== b) bad.push(['explicit3 lost', e2ePort, port, a, b, r]);
}
let message = '';
try { allocateE2EPorts({ PORT: '3100', E2E_PORT_2: '3100' }); } catch (e) { message = String(e.message); }
console.log(JSON.stringify({ n, threw, bad, message }));`;

test('allocateE2EPorts gives three distinct ports or throws, for every combination', () => {
  const href = pathToFileURL(join(root, 'config', 'e2e-ports.ts')).href;
  const r = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', GRID_SCRIPT(href)],
    {
      cwd: root,
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
      encoding: 'utf8',
      timeout: 60_000,
    }
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(out.n, 3 * 10 * 10 * 10, `grid size: ${out.n}`);
  assert.ok(out.threw > 100, `the throwing half of the grid is too small: ${out.threw}`);
  assert.deepEqual(out.bad, []);
  // The CodeRabbit case on #1225: PORT=3100 with E2E_PORT_2=3100 puts main and membership on one
  // port. It throws, and the message names all three final ports.
  assert.match(out.message, /main=3100, membership=3100, survey=\d+/);
});

test('an explicit PLAYWRIGHT_BASE_URL still wins over E2E_PORT', () => {
  const c = load({ E2E_PORT: '45001', PLAYWRIGHT_BASE_URL: 'http://localhost:4999' });
  assert.equal(c.baseURL, 'http://localhost:4999');
});
