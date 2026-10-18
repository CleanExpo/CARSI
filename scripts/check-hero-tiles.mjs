#!/usr/bin/env node
/**
 * Release-time check: every hex-floor hero tile on /subscribe names a course that is published
 * right now. A tile is an illustration of work a published course teaches; if that course is
 * unpublished or renamed, the tile becomes an unbacked claim (membership review, 18/10/2026).
 *
 *   node scripts/check-hero-tiles.mjs                      # live: https://carsi.com.au/api/lms/courses
 *   node scripts/check-hero-tiles.mjs --catalogue file.json # offline, a saved catalogue response
 *
 * Exit 0 all tiles backed · 1 a tile names an unpublished course · 2 catalogue unreadable (fail closed).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TILES_SOURCE = path.join(ROOT, 'src/components/membership/hex-geometry.ts');
const LIVE_URL = 'https://carsi.com.au/api/lms/courses';

/** Course slugs the floor's tiles declare, read from the source of truth. */
export function tileCourseSlugs(source) {
  const block = source.slice(source.indexOf('export const HEX_COURSE_TILES'));
  const end = block.indexOf('] as const;');
  return [...block.slice(0, end).matchAll(/course:\s*'([^']+)'/g)].map((m) => m[1]);
}

/** Published slugs from a /api/lms/courses response body. */
export function publishedSlugs(body) {
  const items = Array.isArray(body) ? body : body?.items ?? body?.courses ?? body?.data;
  if (!Array.isArray(items) || items.length === 0) throw new Error('catalogue response has no courses');
  return new Set(items.map((c) => c?.slug).filter((s) => typeof s === 'string'));
}

/** Tile slugs that are not in the published set. */
export function unbackedTiles(tiles, published) {
  return [...new Set(tiles)].filter((slug) => !published.has(slug));
}

async function main(argv) {
  const tiles = tileCourseSlugs(readFileSync(TILES_SOURCE, 'utf8'));
  if (tiles.length === 0) {
    console.error('check-hero-tiles: no tiles found in hex-geometry.ts');
    return 2;
  }
  let body;
  try {
    const i = argv.indexOf('--catalogue');
    body =
      i >= 0
        ? JSON.parse(readFileSync(argv[i + 1], 'utf8'))
        : await (await fetch(LIVE_URL, { headers: { accept: 'application/json' } })).json();
  } catch (error) {
    console.error(`check-hero-tiles: catalogue unreadable (${error.message}); no verdict`);
    return 2;
  }
  let published;
  try {
    published = publishedSlugs(body);
  } catch (error) {
    console.error(`check-hero-tiles: ${error.message}; no verdict`);
    return 2;
  }
  const missing = unbackedTiles(tiles, published);
  if (missing.length) {
    console.error(`check-hero-tiles: ${missing.length} tile(s) name an unpublished course: ${missing.join(', ')}`);
    return 1;
  }
  console.log(`check-hero-tiles: all ${new Set(tiles).size} tile courses are published`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(await main(process.argv.slice(2)));
}
