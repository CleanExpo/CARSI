// Offline proof that the hero-tile check fails on a tile naming an unpublished course.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { publishedSlugs, tileCourseSlugs, unbackedTiles } from './check-hero-tiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts/check-hero-tiles.mjs');
const tiles = tileCourseSlugs(
  readFileSync(path.join(ROOT, 'src/components/membership/hex-geometry.ts'), 'utf8')
);

/** Run the real CLI against a saved catalogue; returns its exit code. */
function cliExit(catalogue) {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'hero-tiles-')), 'catalogue.json');
  writeFileSync(file, typeof catalogue === 'string' ? catalogue : JSON.stringify(catalogue));
  return spawnSync(process.execPath, [SCRIPT, '--catalogue', file], { encoding: 'utf8' }).status;
}

test('reads every tile slug from the source of truth', () => {
  assert.ok(tiles.length >= 6, `expected the floor's tiles, got ${tiles.length}`);
  assert.ok(tiles.includes('introduction-to-water-damage-restoration'));
});

test('reads slugs in any quote style and refuses a tile whose slug it cannot read', () => {
  const src = (entries) => `export const HEX_COURSE_TILES = [\n${entries}\n] as const;`;
  assert.deepEqual(
    tileCourseSlugs(
      src(
        `{ image: 'a', course: 'one' },\n{ image: "b", course: "two" },\n{ image: 'c', course: \`three\` },`
      )
    ),
    ['one', 'two', 'three']
  );
  assert.throws(() =>
    tileCourseSlugs(src(`{ image: 'a', course: 'one' },\n{ image: 'b', course: SLUG },`))
  );
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
