/**
 * Pure geometry for the membership hex-floor hero. Kept free of DOM and WebGL so it can be
 * unit-tested; `hex-renderer.ts` mirrors the tile hash in GLSL (same constants, same uint
 * arithmetic) so a tile shows the same course on the CPU and the GPU.
 */

/**
 * The floor's tiles. Each image shows work taught by the published course named beside it
 * (every slug resolved on carsi.com.au/api/lms/courses, 18/10/2026). Tiles are illustrations of
 * that work, so copy still never calls a tile "a course". Every image must exist under /public.
 *
 * Every image was inspected at full size (18/10/2026). Excluded, and never to be re-added here:
 * images showing an IICRC discipline acronym or biohazard work CARSI does not
 * teach, a stray colour code, or legible misspelt signage. See BANNED_TILE_IMAGES.
 */
export const HEX_COURSE_TILES = [
  {
    image: '/images/courses/intro-water-damage-restoration.webp',
    course: 'introduction-to-water-damage-restoration',
  },
  {
    image: '/images/courses/intro-infrared-thermography.webp',
    course: 'introduction-to-infrared-thermography-for-drying',
  },
  {
    image: '/images/courses/mould-remediation-level-1.webp',
    course: 'level-1-mould-remediation-2cc96b85',
  },
  {
    image: '/images/courses/mould-remediation-level-2.webp',
    course: 'level-2-mould-remediation-30ee3492',
  },
  { image: '/images/courses/fire-damage-assessment.webp', course: 'fire-smoke-restoration-core' },
  {
    image: '/images/courses/intro-smoke-soot-restoration.webp',
    course: 'introduction-to-smoke-and-soot-damage-restoration',
  },
  {
    image: '/images/courses/soot-removal.webp',
    course: 'introduction-to-smoke-and-soot-damage-restoration',
  },
  {
    image: '/images/courses/intro-odour-control.webp',
    course: 'introduction-to-odour-control-and-removal-techniques',
  },
  {
    image: '/images/courses/hard-floor-cleaning.webp',
    course: 'tile-cleaning-for-carpet-cleaners',
  },
  {
    image: '/images/courses/infection-control-childcare.webp',
    course: 'infection-control-in-child-care',
  },
] as const;

export const HEX_COURSE_IMAGES = HEX_COURSE_TILES.map((t) => t.image);

/**
 * Images inspected at full size (18/10/2026) and cleared: no IICRC discipline acronym or mark, no
 * stray or misspelt text, and the scene shows work the named course teaches. Hero tiles and the
 * landing cards may use only these; a new image needs the same inspection before it is added.
 */
export const INSPECTED_IMAGES = [
  ...HEX_COURSE_TILES.map((t) => t.image),
  '/images/courses/intro-hvac-drying.webp',
] as const;

/** Images that failed the full-size inspection; the tests keep them off the page. */
export const BANNED_TILE_IMAGES = [
  '/images/courses/flood-restoration.webp', // an IICRC discipline acronym printed on the bin
  '/images/courses/containment-barriers.webp', // "BIOHAZARD" tape and an IICRC discipline acronym on the machine
  '/images/courses/donning-doffing-ppe.webp', // "#2490ec" colour code baked into the scene
  '/images/courses/insurance-documentation.webp', // legible misspelt document headings
  '/images/courses/contents-restoration.webp', // legible misspelt "SAVVAGE" box
  '/images/courses/rug-cleaning.webp', // no published course
  '/images/courses/biohazard-remediation.webp', // no published course
  '/images/courses/healthcare-cleaning.webp', // no published course
  '/images/courses/intro-applied-structural-drying.webp', // small illegible machine labels
  '/images/courses/dehumidification.webp', // garbled display text
  '/images/courses/moisture-meter-training.webp', // garbled brand text on the meter
  '/images/courses/carpet-cleaning-basics.webp', // garbled text on the machine
  '/images/courses/glass-cleaning.webp', // rope-access work the course does not teach
  '/images/courses/intro-water-extraction.webp', // garbled lettering on the truck
  '/images/courses/intro-asbestos-awareness.webp', // removal work an awareness course does not teach
  '/images/courses/risk-assessment.webp', // misspelt clipboard heading
  '/images/courses/air-filtration-equipment.webp', // garbled machine labels
  '/images/courses/intro-safety-procedures.webp', // misspelt confined-space sign
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
