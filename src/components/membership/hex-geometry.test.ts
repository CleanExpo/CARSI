import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  atlasLayout,
  axialRound,
  axialToWorld,
  cellAt,
  chooseHexMode,
  HEX_COURSE_IMAGES,
  TILE_HASH,
  tileCourseIndex,
} from './hex-geometry';

describe('hex geometry', () => {
  it('maps every cell centre (and points near it) back to the same cell', () => {
    for (let q = -6; q <= 6; q++) {
      for (let r = -6; r <= 6; r++) {
        const [x, y] = axialToWorld([q, r]);
        expect(cellAt(x, y)).toEqual([q, r]);
        // 0.45 is inside the hexagon's inscribed circle (apothem 0.5) in every direction.
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI) / 3 + 0.2;
          expect(cellAt(x + 0.45 * Math.cos(ang), y + 0.45 * Math.sin(ang))).toEqual([q, r]);
        }
      }
    }
  });

  it('places the six neighbours exactly one unit away', () => {
    const [cx, cy] = axialToWorld([0, 0]);
    const nbrs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [-1, 1],
      [1, -1],
    ];
    for (const n of nbrs) {
      const [x, y] = axialToWorld(n);
      expect(Math.hypot(x - cx, y - cy)).toBeCloseTo(1, 10);
    }
  });

  it('cube rounding always returns a valid cube coordinate', () => {
    for (let i = 0; i < 500; i++) {
      const q = Math.sin(i) * 9.3;
      const r = Math.cos(i * 1.7) * 7.1;
      const [rq, rr] = axialRound(q, r);
      expect(Number.isInteger(rq) && Number.isInteger(rr)).toBe(true);
    }
  });

  it('assigns courses deterministically, in range, and uses every course on screen', () => {
    const n = HEX_COURSE_IMAGES.length;
    const seen = new Set<number>();
    for (let q = -20; q <= 20; q++) {
      for (let r = -12; r <= 12; r++) {
        const idx = tileCourseIndex(q, r, n);
        expect(idx).toBe(tileCourseIndex(q, r, n));
        expect(idx >= 0 && idx < n).toBe(true);
        seen.add(idx);
      }
    }
    expect(seen.size).toBe(n);
  });

  it('keeps the shader hash in lock-step with the CPU hash', () => {
    const src = readFileSync(path.join(__dirname, 'hex-renderer.ts'), 'utf8');
    expect(src).toContain('${TILE_HASH.a}u');
    expect(src).toContain('${TILE_HASH.b}u');
    expect(src).toContain('${TILE_HASH.c}u');
    expect(src).toMatch(/h \^= h >> 13u;[\s\S]*h \*= \$\{TILE_HASH\.c\}u;[\s\S]*h \^= h >> 16u;/);
    expect(TILE_HASH).toEqual({ a: 73856093, b: 19349663, c: 1274126177 });
  });

  it('lays the atlas out with a unique slot for every course', () => {
    for (const n of [1, 2, 5, 24, 30]) {
      const { cols, rows } = atlasLayout(n);
      expect(cols * rows).toBeGreaterThanOrEqual(n);
      expect(cols * (rows - 1)).toBeLessThan(n);
    }
  });

  it('lists only course images that exist in /public', () => {
    expect(new Set(HEX_COURSE_IMAGES).size).toBe(HEX_COURSE_IMAGES.length);
    for (const src of HEX_COURSE_IMAGES) {
      expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
    }
  });

  it('chooses fallback without WebGL2 and a still frame for reduced motion', () => {
    expect(chooseHexMode({ webgl2: false, reducedMotion: false })).toBe('fallback');
    expect(chooseHexMode({ webgl2: false, reducedMotion: true })).toBe('fallback');
    expect(chooseHexMode({ webgl2: true, reducedMotion: true })).toBe('static');
    expect(chooseHexMode({ webgl2: true, reducedMotion: false })).toBe('animate');
  });
});
