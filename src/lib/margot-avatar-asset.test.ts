/**
 * The Margot chat launcher renders on every public page (at <= 44 CSS px) and `images` are
 * unoptimised in next.config, so the file at MARGOT_AVATAR_PATH is exactly what every visitor
 * downloads. Live on 18/10/2026 that was a 2.1 MB 1024x1536 PNG — Lighthouse's largest
 * image-delivery saving on the home and course pages.
 */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MARGOT_AVATAR_PATH } from './margot-surface';

const MAX_BYTES = 60 * 1024;

describe('Margot avatar asset', () => {
  it('exists and is small enough to ship on every page', () => {
    const file = join(process.cwd(), 'public', MARGOT_AVATAR_PATH);
    expect(existsSync(file), MARGOT_AVATAR_PATH).toBe(true);
    expect(statSync(file).size).toBeLessThanOrEqual(MAX_BYTES);
  });
});
