import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    // Vitest's default is 5000ms, and it was too tight for THIS suite — not because any
    // test is slow, but because 173 files run in parallel and a loaded machine inflates
    // wall-clock time several-fold while the work itself is unchanged.
    //
    // MEASURED on an idle machine, 2026-09-07, across all 1361 tests:
    //   slowest test overall ................ 1200ms  (guest-checkout.test.ts)
    //   root-layout-scripts.test.tsx ........  588ms
    // Under contention that 588ms test was observed at 5358ms — a ~9x inflation — and it
    // failed release-gate verification TWICE with `Test timed out in 5000ms`, a different
    // test in the file each run. A second file, stability-evidence.test.ts, was observed
    // doing the same by an independent reviewer.
    //
    // WHY 15000 AND NOT MORE. It must absorb contention without going blind to a genuine
    // regression. Against the measured 1200ms worst case this leaves a 12.5x margin: a
    // test that truly becomes slow still blows through it, while a busy CI runner does not
    // fail a passing test. Raising this further, or removing it, trades away that signal.
    //
    // If a test ever legitimately needs longer, give THAT file its own `vi.setConfig` —
    // do not raise this number. And if the numbers above no longer hold, re-measure with
    // `npx vitest run --reporter=json` rather than adjusting on intuition.
    testTimeout: 15_000,
  },
});
