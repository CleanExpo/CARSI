#!/usr/bin/env node
/**
 * Non-vacuity proof for the Reticle production-leak scan (scripts/check-reticle-build-leak.mjs,
 * GP-596).
 *
 * Every case runs on a temporary build tree, never the real .next. If the scan is made inert
 * (needle list emptied, a directory skipped, a missing or empty directory treated as clean),
 * this goes red.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NEEDLES, SCAN_DIRS, scanBuild } from './check-reticle-build-leak.mjs';

const SCRIPT = fileURLToPath(new URL('./check-reticle-build-leak.mjs', import.meta.url));
let failed = 0;
const check = (ok, name) => {
  if (ok) console.log(`✓ ${name}`);
  else {
    console.error(`✖ ${name}`);
    failed++;
  }
};

/** A clean build tree: a client chunk, a server page and a binary-ish file in each directory. */
function cleanTree() {
  const root = mkdtempSync(join(tmpdir(), 'reticle-leak-'));
  mkdirSync(join(root, '.next/static/chunks/app'), { recursive: true });
  mkdirSync(join(root, '.next/server/app/pricing'), { recursive: true });
  writeFileSync(join(root, '.next/static/chunks/app/page-abc.js'), 'self.__next_f.push([1,"pricing"]);');
  writeFileSync(join(root, '.next/static/chunks/main.js.map'), '{"sources":["webpack://_N_E/./src/app/page.tsx"]}');
  writeFileSync(join(root, '.next/server/app/pricing/page.js'), 'module.exports = { reticle: false };');
  writeFileSync(join(root, '.next/server/app/pricing/page.js.nft.json'), '{"files":["../../chunks/1.js"]}');
  return root;
}

const roots = [];
const tree = () => {
  const r = cleanTree();
  roots.push(r);
  return r;
};

try {
  // The required needles are listed here independently of the scanner, so dropping or swapping
  // one there fails here (GP-793, review P2: a same-length swap passed a length check).
  const REQUIRED = ['reticlehq', 'ReticleDev', 'reticle-dev', 'NEXT_PUBLIC_RETICLE', 'carsi-0f3ff945'];
  for (const n of REQUIRED) check(NEEDLES.includes(n), `needle list includes "${n}"`);
  check(SCAN_DIRS.includes('.next/static') && SCAN_DIRS.includes('.next/server'), 'scans both static and server');

  // A clean tree passes and counts its files.
  {
    const r = scanBuild(tree());
    check(r.hits.length === 0 && r.errors.length === 0, 'clean tree passes');
    check(r.scanned['.next/static'] === 2 && r.scanned['.next/server'] === 2, 'clean tree file counts are reported');
  }

  // Every needle is caught in a browser chunk and in a server file, including inside a source map.
  for (const needle of NEEDLES) {
    for (const [dir, file] of [
      ['.next/static', 'chunks/app/page-abc.js'],
      ['.next/static', 'chunks/main.js.map'],
      ['.next/server', 'app/pricing/page.js'],
    ]) {
      const root = tree();
      writeFileSync(join(root, dir, file), `prefix ${needle} suffix`);
      const r = scanBuild(root);
      check(
        r.hits.some((h) => h.needle === needle && h.file.endsWith(file)),
        `catches "${needle}" in ${dir}/${file}`
      );
    }
  }

  // The real shape a leak would take: the package import in a minified client chunk.
  {
    const root = tree();
    writeFileSync(
      join(root, '.next/static/chunks/app/page-abc.js'),
      'Promise.resolve().then(n.bind(n,"@reticlehq/react")).then(({reticle:e})=>e.install({projectId:"carsi-0f3ff945"}))'
    );
    check(scanBuild(root).hits.length === 2, 'catches a dynamic @reticlehq import with the project id');
  }

  // Source maps: the compiled code is scanned in the .js file beside the map, so a map's
  // `sourcesContent` (copies of the original source, comments included) is not scanned. The
  // first real CI-equivalent build hit "carsi-0f3ff945" in a comment of PricingTiers.tsx inside
  // a server map. A map that names a Reticle file in `sources`, or carries it in generated
  // code fields, is still caught, in a plain map and in an index map with sections.
  {
    const comment = '/** The Reticle flow .reticle/flows/carsi-0f3ff945/x.json pins this. */\nexport const a = 1;';
    const plain = { version: 3, sources: ['../src/a.tsx'], sourcesContent: [comment], names: [], mappings: 'AAAA' };
    const indexed = { version: 3, sections: [{ offset: { line: 0, column: 0 }, map: plain }] };
    for (const [label, map] of [['plain', plain], ['index', indexed]]) {
      const root = tree();
      writeFileSync(join(root, '.next/server/app/pricing/page.js.map'), JSON.stringify(map));
      check(scanBuild(root).hits.length === 0, `ignores a needle only in sourcesContent (${label} map)`);
    }
    const leakMap = { ...plain, sources: ['../node_modules/@reticlehq/react/dist/index.js'] };
    for (const [label, map] of [
      ['plain', leakMap],
      ['index', { version: 3, sections: [{ offset: { line: 0, column: 0 }, map: leakMap }] }],
    ]) {
      const root = tree();
      writeFileSync(join(root, '.next/static/chunks/main.js.map'), JSON.stringify(map));
      check(
        scanBuild(root).hits.some((h) => h.needle === 'reticlehq'),
        `catches a Reticle path in sources (${label} map)`
      );
    }
    // A map that is not valid JSON is scanned raw, so it cannot hide a hit.
    const root = tree();
    writeFileSync(join(root, '.next/static/chunks/main.js.map'), '{"sources":["@reticlehq/react"');
    check(scanBuild(root).hits.length === 1, 'scans an unparseable map raw');
  }

  // A missing directory fails, rather than reading as clean.
  for (const dir of SCAN_DIRS) {
    const root = tree();
    rmSync(join(root, dir), { recursive: true });
    const r = scanBuild(root);
    check(r.errors.some((e) => e.startsWith(dir) && e.includes('missing')), `missing ${dir} fails`);
  }

  // An empty directory fails: a scan that read nothing is not a pass.
  for (const dir of SCAN_DIRS) {
    const root = tree();
    rmSync(join(root, dir), { recursive: true });
    mkdirSync(join(root, dir, 'empty-subdir'), { recursive: true });
    const r = scanBuild(root);
    check(r.errors.some((e) => e.startsWith(dir) && e.includes('no files')), `empty ${dir} fails`);
  }

  // The CLI exits 1 on a hit, 1 on no build, and 0 on a clean tree (the CI step relies on the exit code).
  {
    const leak = tree();
    writeFileSync(join(leak, '.next/server/app/pricing/page.js'), 'require("@reticlehq/next")');
    const run = (root) => spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
    check(run(leak).status === 1, 'CLI exits 1 on a hit');
    const none = mkdtempSync(join(tmpdir(), 'reticle-leak-none-'));
    roots.push(none);
    check(run(none).status === 1, 'CLI exits 1 when there is no build');
    const clean = run(tree());
    check(clean.status === 0 && /scanned 2 files in \.next\/static/.test(clean.stdout), 'CLI exits 0 on a clean tree and prints counts');
  }
} finally {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
}

console.log(failed === 0 ? '\nAll Reticle leak-scan cases hold.' : `\n${failed} case(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
