import { describe, expect, it } from 'vitest';

import config from '../../vitest.config';

/**
 * Guards the suite-wide `testTimeout`.
 *
 * Vitest defaults to 5000ms. That default failed release-gate verification TWICE on
 * 2026-09-07 with `Test timed out in 5000ms` — a different test each run, in a file whose
 * assertions were sound. The cause was never a slow test: the files that timed out do well
 * under a second of actual work, while several hundred suites running in parallel on a loaded
 * machine inflate wall-clock time many-fold. The exact suite count is deliberately not stated
 * here or in vitest.config.ts — it grows with every test added, so it is one more figure that
 * would go stale and be refuted by the next reader to run the suite.
 *
 * Per-test timings here are NOT reproducible — the same test has been observed varying by
 * up to 8.8x between runs, and two release reviews were failed for quoting a single run as
 * a worst case. See vitest.config.ts for the sampled scatter and for why the margin is
 * argued against the highest value ever recorded (5459ms) rather than against any one run.
 * Do not restate a point measurement in this file.
 *
 * A test that fails on machine timing rather than on the behaviour it asserts is worse than
 * no test: it blocks releases at random AND trains readers to dismiss its failures, so the
 * day it fails for a real reason nobody looks.
 *
 * This test exists because the setting is one line in a config file, easy to delete in a
 * merge or "simplify the config" pass, and its absence is silent until a release blocks.
 */
describe('suite-wide test timeout', () => {
  const timeout = (config as { test?: { testTimeout?: number } }).test?.testTimeout;

  it('positive control: the config exposes a test section', () => {
    // Without this, a config that failed to load would make every assertion below vacuous.
    expect((config as { test?: unknown }).test).toBeDefined();
  });

  it('is set explicitly rather than left on the 5000ms default', () => {
    expect(timeout).toBeDefined();
    expect(typeof timeout).toBe('number');
  });

  it('is high enough to absorb parallel contention', () => {
    // The highest per-test time ever recorded on this suite is 5459ms, under heavy load.
    // Anything at or below 5000ms reinstates the exact failure this guards against.
    expect(timeout as number).toBeGreaterThanOrEqual(15_000);
  });

  it('is not so high that a genuine regression goes unnoticed', () => {
    // Against the 5459ms worst ever recorded, 60s would be an 11x margin — at that point the
    // timeout has stopped being a signal. If a single file truly needs longer, give that FILE
    // its own vi.setConfig rather than raising this ceiling for everything.
    expect(timeout as number).toBeLessThanOrEqual(60_000);
  });
});
