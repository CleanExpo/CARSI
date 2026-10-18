// Offline proof that the hero-tile check fails on a tile naming an unpublished course.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadTiles, publishedSlugs, tileCourseSlugs, unbackedTiles } from './check-hero-tiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts/check-hero-tiles.mjs');
const tiles = tileCourseSlugs(await loadTiles());

/** Run the real CLI against a saved catalogue; returns its exit code. */
function cliExit(catalogue) {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'hero-tiles-')), 'catalogue.json');
  writeFileSync(file, typeof catalogue === 'string' ? catalogue : JSON.stringify(catalogue));
  return spawnSync(process.execPath, [SCRIPT, '--catalogue', file], { encoding: 'utf8' }).status;
}

test('reads every tile slug from the source of truth', () => {
  assert.ok(tiles.length >= 4, `expected the floor's tiles, got ${tiles.length}`);
  assert.ok(tiles.includes('introduction-to-water-damage-restoration'));
});

test('refuses a tile whose course is not a slug string', () => {
  assert.deepEqual(tileCourseSlugs([{ course: 'one' }, { course: 'two' }]), ['one', 'two']);
  assert.throws(() => tileCourseSlugs([{ course: 'one' }, { image: 'x' }]));
  assert.throws(() => tileCourseSlugs([{ course: 'Not A Slug' }]));
  assert.throws(() => tileCourseSlugs([]));
});

test('checks the real course value, not a comment beside it (review round 5)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'hero-tiles-src-'));
  const src = path.join(dir, 'tiles.ts');
  writeFileSync(
    src,
    "const UNPUBLISHED: string = 'review-unpublished-course';\n" +
      'export const HEX_COURSE_TILES = [\n' +
      "  { image: 'a', course: UNPUBLISHED }, // course: 'introduction-to-water-damage-restoration'\n" +
      '] as const;\n'
  );
  const catalogue = path.join(dir, 'catalogue.json');
  writeFileSync(catalogue, JSON.stringify({ items: tiles.map((slug) => ({ slug })) }));
  const run = spawnSync(process.execPath, [SCRIPT, '--catalogue', catalogue, '--tiles', src], {
    encoding: 'utf8',
  });
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /review-unpublished-course/);
});

test('all tiles backed when the catalogue publishes every slug', () => {
  const published = publishedSlugs({ items: tiles.map((slug) => ({ slug })) });
  assert.deepEqual(unbackedTiles(tiles, published), []);
});

test('a syntactically valid but unpublished slug is reported', () => {
  const published = publishedSlugs({
    items: tiles.filter((s) => s !== tiles[0]).map((slug) => ({ slug })),
  });
  assert.deepEqual(unbackedTiles([...tiles, 'not-a-published-course'], published), [
    tiles[0],
    'not-a-published-course',
  ]);
});

test('an empty or malformed catalogue gives no verdict', () => {
  assert.throws(() => publishedSlugs({ items: [] }));
  assert.throws(() => publishedSlugs({ unexpected: true }));
});

test('the CLI exits 0 when every tile is published, 1 when one is not, 2 with no verdict', () => {
  assert.equal(cliExit({ items: tiles.map((slug) => ({ slug })) }), 0);
  assert.equal(cliExit({ items: tiles.slice(1).map((slug) => ({ slug })) }), 1);
  assert.equal(cliExit({ items: [] }), 2);
  assert.equal(cliExit('not json'), 2);
});
