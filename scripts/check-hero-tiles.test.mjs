// Offline proof that the hero-tile check fails on a tile naming an unpublished course.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { publishedSlugs, tileCourseSlugs, unbackedTiles } from './check-hero-tiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tiles = tileCourseSlugs(readFileSync(path.join(ROOT, 'src/components/membership/hex-geometry.ts'), 'utf8'));

test('reads every tile slug from the source of truth', () => {
  assert.ok(tiles.length >= 10, `expected the floor's tiles, got ${tiles.length}`);
  assert.ok(tiles.includes('introduction-to-water-damage-restoration'));
});

test('all tiles backed when the catalogue publishes every slug', () => {
  const published = publishedSlugs({ items: tiles.map((slug) => ({ slug })) });
  assert.deepEqual(unbackedTiles(tiles, published), []);
});

test('a syntactically valid but unpublished slug is reported', () => {
  const published = publishedSlugs({ items: tiles.filter((s) => s !== tiles[0]).map((slug) => ({ slug })) });
  assert.deepEqual(unbackedTiles([...tiles, 'not-a-published-course'], published), [tiles[0], 'not-a-published-course']);
});

test('an empty or malformed catalogue gives no verdict', () => {
  assert.throws(() => publishedSlugs({ items: [] }));
  assert.throws(() => publishedSlugs({ unexpected: true }));
});
