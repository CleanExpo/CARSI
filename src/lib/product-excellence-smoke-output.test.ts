import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * GP-781: the product-excellence smoke prints plain-text status marks. Tick and cross symbols
 * render as boxes in some Windows terminals and CI log viewers, so a failed step could read
 * as a garbled line instead of a failure.
 */
const SMOKE = path.join(process.cwd(), 'scripts/product-excellence-smoke.mjs');

describe('product-excellence smoke output', () => {
  const source = readFileSync(SMOKE, 'utf8');

  it('uses no tick or cross symbols', () => {
    expect(source).not.toMatch(/[✓✔✗✘✅❌]/u);
  });

  it('marks a failed step and the passing run in plain text', () => {
    expect(source).toContain('FAIL: ${step.label} failed');
    expect(source).toContain('PASS: product-excellence automated smoke passed');
  });
});
