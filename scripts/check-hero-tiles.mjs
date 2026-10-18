#!/usr/bin/env node
/**
 * Release-time check: every hex-floor hero tile on /subscribe names a course that is published
 * right now. A tile is an illustration of work a published course teaches; if that course is
 * unpublished or renamed, the tile becomes an unbacked claim (membership review, 18/10/2026).
 *
 *   node scripts/check-hero-tiles.mjs                      # live: https://carsi.com.au/api/lms/courses
 *   node scripts/check-hero-tiles.mjs --catalogue file.json # offline, a saved catalogue response
 *   --tiles file.ts                                         # check another tile module (tests)
 *
 * Exit 0 all tiles backed · 1 a tile names an unpublished course · 2 tiles or catalogue unreadable (fail closed).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TILES_SOURCE = path.join(ROOT, 'src/components/membership/hex-geometry.ts');
const LIVE_URL = 'https://carsi.com.au/api/lms/courses';

/**
 * Course slugs the floor's tiles declare, taken from the evaluated tile data (not the source text),
 * so a comment or a constant can never stand in for a tile's real course. Throws on any tile whose
 * course is not a slug string, so an unreadable tile can never pass unchecked.
 */
export function tileCourseSlugs(tiles) {
  if (!Array.isArray(tiles) || tiles.length === 0) throw new Error('no tiles');
  return tiles.map((tile, i) => {
    const course = tile?.course;
    if (typeof course !== 'string' || !/^[a-z0-9-]+$/.test(course)) {
      throw new Error(`tile ${i} has no readable course slug`);
    }
    return course;
  });
}

/** The floor's tiles, loaded from the source of truth (Node strips the TypeScript types). */
export async function loadTiles(source = TILES_SOURCE) {
  return (await import(pathToFileURL(source).href)).HEX_COURSE_TILES;
}

/** Published slugs from a /api/lms/courses response body. */
export function publishedSlugs(body) {
  const items = Array.isArray(body) ? body : (body?.items ?? body?.courses ?? body?.data);
  if (!Array.isArray(items) || items.length === 0)
    throw new Error('catalogue response has no courses');
  return new Set(items.map((c) => c?.slug).filter((s) => typeof s === 'string'));
}

/** Tile slugs that are not in the published set. */
export function unbackedTiles(tiles, published) {
  return [...new Set(tiles)].filter((slug) => !published.has(slug));
}

async function main(argv) {
  let tiles;
  try {
    const i = argv.indexOf('--tiles');
    tiles = tileCourseSlugs(await loadTiles(i >= 0 ? path.resolve(argv[i + 1]) : TILES_SOURCE));
  } catch (error) {
    console.error(`check-hero-tiles: tiles unreadable (${error.message}); no verdict`);
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
    console.error(
      `check-hero-tiles: ${missing.length} tile(s) name an unpublished course: ${missing.join(', ')}`
    );
    return 1;
  }
  console.log(`check-hero-tiles: all ${new Set(tiles).size} tile courses are published`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(await main(process.argv.slice(2)));
}
