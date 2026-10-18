#!/usr/bin/env node
/**
 * Cuts the membership hero's square tile images from course images.
 *
 *   node scripts/build-hero-tiles.mjs   # writes public/images/hero-tiles/<name>.webp
 *
 * Course images are AI-generated and most carry stray pseudo-lettering somewhere (meter screens,
 * sleeves, signs, machine labels). Each crop frames work the named course teaches and leaves every
 * such mark outside the frame, so the tile file itself holds no text, lettering, logo or mark.
 * After changing a crop, inspect the new file at full size before listing it in INSPECTED_IMAGES
 * (src/components/membership/hex-geometry.ts).
 *
 * Inspected and not used (18/10/2026): fire-damage-assessment (garbled sleeve lettering in the
 * work area), mould-remediation-level-2 (labelled box behind the worker), stone-tile-cleaning,
 * intro-applied-microbial-remediation and intro-smoke-soot-restoration (logos on the worker).
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** name, source course image, and the square crop (pixels in the source image). */
export const HERO_TILE_CROPS = [
  {
    name: 'water-moisture-check',
    source: 'intro-water-damage-restoration',
    left: 300,
    top: 0,
    size: 675,
  },
  {
    name: 'carpet-extraction',
    source: 'intro-carpet-cleaning-drying',
    left: 500,
    top: 0,
    size: 675,
  },
  { name: 'mould-sampling', source: 'mould-remediation-level-1', left: 620, top: 0, size: 560 },
  { name: 'soot-ceiling-cleaning', source: 'soot-removal', left: 380, top: 40, size: 520 },
  {
    name: 'structural-drying-airflow',
    source: 'intro-structural-drying-concepts',
    left: 400,
    top: 230,
    size: 600,
  },
  {
    name: 'infrared-moisture-image',
    source: 'intro-infrared-thermography',
    left: 80,
    top: 160,
    size: 480,
  },
];

async function main() {
  const sharp = createRequire(import.meta.url)('sharp');
  const out = path.join(ROOT, 'public/images/hero-tiles');
  mkdirSync(out, { recursive: true });
  for (const { name, source, left, top, size } of HERO_TILE_CROPS) {
    await sharp(path.join(ROOT, 'public/images/courses', `${source}.webp`))
      .extract({ left, top, width: size, height: size })
      .resize(512, 512)
      .webp({ quality: 82 })
      .toFile(path.join(out, `${name}.webp`));
    console.log(`hero tile: ${name}.webp`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
