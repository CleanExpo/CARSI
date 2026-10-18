/**
 * Pure geometry for the membership hex-floor hero. Kept free of DOM and WebGL so it can be
 * unit-tested; `hex-renderer.ts` mirrors the tile hash in GLSL (same constants, same uint
 * arithmetic) so a tile shows the same course on the CPU and the GPU.
 */

/**
 * The floor's tiles. Each image is a square crop, cut by scripts/build-hero-tiles.mjs, that frames
 * work taught by the published course named beside it (every slug resolved on
 * carsi.com.au/api/lms/courses, 18/10/2026). Tiles are illustrations of that work, so copy still
 * never calls a tile "a course". Every image must exist under /public.
 */
export const HEX_COURSE_TILES = [
  {
    image: '/images/hero-tiles/water-moisture-check.webp',
    course: 'introduction-to-water-damage-restoration',
  },
  {
    image: '/images/hero-tiles/carpet-extraction.webp',
    course: 'introduction-to-basic-carpet-cleaning-and-drying',
  },
  { image: '/images/hero-tiles/mould-patch.webp', course: 'level-1-mould-remediation-2cc96b85' },
  {
    image: '/images/hero-tiles/soot-ceiling-cleaning.webp',
    course: 'introduction-to-smoke-and-soot-damage-restoration',
  },
  {
    image: '/images/hero-tiles/structural-drying-airflow.webp',
    course: 'introduction-to-structural-drying-concepts',
  },
] as const;

export const HEX_COURSE_IMAGES = HEX_COURSE_TILES.map((t) => t.image);

/**
 * Hero-tile crops inspected at full size (18/10/2026): no text, lettering, logo or mark anywhere in
 * the frame, and the scene shows work the named course teaches. Written out by hand on purpose: a
 * tile with any other image fails the tests until that image is inspected and listed here.
 */
export const INSPECTED_IMAGES = [
  '/images/hero-tiles/water-moisture-check.webp',
  '/images/hero-tiles/carpet-extraction.webp',
  '/images/hero-tiles/mould-patch.webp',
  '/images/hero-tiles/soot-ceiling-cleaning.webp',
  '/images/hero-tiles/structural-drying-airflow.webp',
] as const;

/** Pixel size of one square slot in the course atlas texture. */
export const ATLAS_SLOT = 256;

/** Hash constants shared with the GLSL `tileHash` in hex-renderer.ts. */
export const TILE_HASH = { a: 73856093, b: 19349663, c: 1274126177 } as const;

export type Axial = readonly [q: number, r: number];

const SQ3_HALF = Math.sqrt(3) / 2;

/** Centre of axial cell (q, r) on a lattice whose neighbouring centres are 1 unit apart. */
export function axialToWorld([q, r]: Axial): [number, number] {
  return [q + 0.5 * r, r * SQ3_HALF];
}

/** Fractional axial coordinates of a world point (inverse of `axialToWorld`). */
export function worldToAxial(x: number, y: number): [number, number] {
  const r = y / SQ3_HALF;
  return [x - 0.5 * r, r];
}

/** Round fractional axial coordinates to the containing cell (cube rounding). */
export function axialRound(q: number, r: number): [number, number] {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [rq + 0, rr + 0]; // `+ 0` turns -0 into 0
}

/** The cell that contains a world point. */
export function cellAt(x: number, y: number): [number, number] {
  const [q, r] = worldToAxial(x, y);
  return axialRound(q, r);
}

/** Which course a cell shows. Identical uint arithmetic to the shader's `tileHash`. */
export function tileCourseIndex(q: number, r: number, count: number): number {
  let h = (Math.imul(q | 0, TILE_HASH.a) ^ Math.imul(r | 0, TILE_HASH.b)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, TILE_HASH.c) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h % count;
}

/** Near-square grid that holds `count` atlas slots. */
export function atlasLayout(count: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  return { cols, rows: Math.max(1, Math.ceil(count / cols)) };
}

export type HexMode = 'animate' | 'static' | 'fallback';

/** WebGL2 is required for any canvas; reduced motion gets one still frame. */
export function chooseHexMode(env: { webgl2: boolean; reducedMotion: boolean }): HexMode {
  if (!env.webgl2) return 'fallback';
  return env.reducedMotion ? 'static' : 'animate';
}
