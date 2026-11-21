#!/usr/bin/env node
/**
 * GP-711: check:built-site must scan what a visitor is served and nothing else, and must finish.
 *
 * No `next build` is run. A small fixture mimics `.next`: prerendered HTML, an RSC payload, a
 * server chunk, a client chunk with a 200,000-character minified line, its source map, a
 * `standalone` copy, a `cache` folder and an `.nft.json` trace. Banned phrasings are planted in
 * BOTH served and unserved files, so the test proves the walk reaches the served ones (the guard
 * can fail) and skips the rest (it does not scan duplicates or maps).
 *
 * `legacyWalk` is the walk the ticket measured — everything under the root except a top-level
 * `cache` — kept here only as the reference the new walk is compared against.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBuiltSite, listServedFiles, scanBuiltFile } from './check-built-site.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-built-site.mjs');
let failed = 0;
const ok = (cond, name) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
};

// Realistic minified code: frequent `.`, the copy words the CEC-claim rule keys on, no claim.
const UNIT =
  'function(e,t){var n=e.courses,r=t.training;return n.count(r)&&e.earn?{award:n,carry:r}:null}';
const minified = (len) => UNIT.repeat(Math.ceil(len / UNIT.length)).slice(0, len);
const PLANT_CHUNK = 'children:"Get IICRC certified with CARSI today"';
const PLANT_HTML_SPLIT = '<p>Browse our <strong>IICRC</strong> courses today</p>';
const PLANT_UNSERVED = 'Enrol in our IICRC courses and get IICRC certified with CARSI';

function buildFixture(root) {
  const put = (rel, text) => {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  };
  const chunk = `${minified(200_000)};${PLANT_CHUNK}`;
  put(
    'server/app/index.html',
    `<!DOCTYPE html><html><body><h1>CARSI</h1>${PLANT_HTML_SPLIT}</body></html>`
  );
  put(
    'server/app/about.html',
    '<html><body><p>CARSI is an IICRC CEC Accredited provider.</p></body></html>'
  );
  put(
    'server/app/index.rsc',
    '1:"$Sreact.fragment"\n2:["$","p",null,{"children":"Restoration courses"}]\n'
  );
  put('server/app/page.js', minified(5_000));
  put('server/app/page.js.nft.json', JSON.stringify({ version: 1, files: [PLANT_UNSERVED] }));
  put('static/chunks/app/page-abc123.js', chunk);
  // A source map: one long line holding the original source, banned copy included.
  put(
    'static/chunks/app/page-abc123.js.map',
    JSON.stringify({ version: 3, sourcesContent: [PLANT_UNSERVED] })
  );
  put('static/css/app.css', 'body{color:#000}');
  // standalone: a second copy of the app, its own node_modules and a nested .next.
  put('standalone/server.js', minified(1_000));
  put('standalone/.next/static/chunks/app/page-abc123.js', chunk);
  put('standalone/node_modules/pkg/index.js', `module.exports="${PLANT_UNSERVED}"`);
  put('standalone/src/app/page.tsx', `<p>${PLANT_UNSERVED}</p>`);
  put('cache/webpack/client-production/0.pack', PLANT_UNSERVED);
  put('server/cache/fetch/x.json', JSON.stringify({ body: PLANT_UNSERVED }));
  return root;
}

function legacyWalk(root) {
  const out = [];
  const walk = (dir, top) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!(top && ent.name === 'cache')) walk(p, false);
      } else out.push(p);
    }
  };
  walk(root, true);
  return out;
}

const tmp = mkdtempSync(join(tmpdir(), 'gp711-'));
try {
  const root = buildFixture(join(tmp, '.next'));
  const rel = (files) => files.map((f) => relative(root, f).split(sep).join('/'));

  console.log('walk');
  const legacy = rel(legacyWalk(root));
  const { files, excluded } = listServedFiles(root);
  const served = rel(files);
  ok(
    legacy.some((f) => f.endsWith('.map')),
    'reference: the legacy walk reaches the source map'
  );
  ok(
    legacy.some((f) => f.startsWith('standalone/')),
    'reference: the legacy walk reaches standalone/'
  );
  ok(!served.some((f) => f.endsWith('.map')), 'no source map is scanned');
  ok(
    !served.some((f) => f.startsWith('standalone/') || f.includes('/standalone/')),
    'standalone/ is not scanned'
  );
  ok(!served.some((f) => f.split('/').includes('cache')), 'cache/ is not scanned at any depth');
  ok(!served.some((f) => f.endsWith('.nft.json')), 'no .nft.json trace is scanned');
  for (const want of [
    'server/app/index.html',
    'server/app/about.html',
    'server/app/index.rsc',
    'server/app/page.js',
    'static/chunks/app/page-abc123.js',
  ]) {
    ok(served.includes(want), `served file is scanned: ${want}`);
  }
  ok(
    excluded['*.map (not served)']?.files === 1 &&
      excluded['standalone/ (not served)']?.files === 4 &&
      excluded['cache/ (not served)']?.files === 2,
    'every exclusion is counted for the report'
  );

  console.log('scan');
  const t = performance.now();
  const result = checkBuiltSite(root);
  const ms = performance.now() - t;
  const text = result.findings.join('\n');
  ok(ms < 15_000, `fixture scan finishes under 15s (took ${(ms / 1000).toFixed(2)}s)`);
  ok(
    /static\/chunks\/app\/page-abc123\.js:1:/.test(text),
    'planted phrase in the 200k-char served chunk is flagged'
  );
  ok(
    /server\/app\/index\.html:1:/.test(text),
    'phrase split by HTML tags in a served page is flagged'
  );
  ok(!/about\.html/.test(text), 'compliant provider wording is not flagged');
  ok(!/\.map|standalone|cache|nft\.json/.test(text), 'nothing is reported from an unserved file');
  ok(
    scanBuiltFile('x.html', '<p>IICRC <em>CEC</em> Accredited</p>').length === 0,
    'tag-stripped HTML view does not invent a finding from compliant wording'
  );

  console.log('cli');
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  const dirty = run('--dir', root);
  ok(dirty.status === 1, `exits 1 on the planted fixture (got ${dirty.status})`);
  ok(
    /excluded \*\.map \(not served\): 1 files/.test(dirty.stdout),
    'prints the source-map exclusion'
  );
  ok(
    /excluded standalone\/ \(not served\): 4 files/.test(dirty.stdout),
    'prints the standalone exclusion'
  );

  const clean = join(tmp, 'clean');
  mkdirSync(join(clean, 'server/app'), { recursive: true });
  writeFileSync(
    join(clean, 'server/app/index.html'),
    '<p>CARSI is an IICRC CEC Accredited provider.</p>'
  );
  ok(run('--dir', clean).status === 0, 'exits 0 on a clean build');

  const empty = join(tmp, 'empty');
  mkdirSync(join(empty, 'standalone'), { recursive: true });
  writeFileSync(join(empty, 'standalone/a.js'), PLANT_UNSERVED);
  ok(
    run('--dir', empty).status === 2,
    'exits 2 when nothing served is found (silence is not a pass)'
  );
  ok(
    run('--dir', join(tmp, 'missing')).status === 2,
    'exits 2 when the build directory is missing'
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`\n✖ check-built-site self-test: ${failed} failed`);
  process.exit(1);
}
console.log('\n✓ check-built-site self-test passed');
