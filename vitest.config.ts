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
    // Vitest's default is 5000ms and it was too tight for THIS suite — not because the
    // tests that failed are slow, but because 548 suites run in parallel and a loaded
    // machine inflates wall-clock time many-fold while the work itself is unchanged.
    //
    // MEASURED 2026-09-07 on an idle box (load ~5), `npx vitest run --reporter=json`,
    // 1365 tests. `testTimeout` is per TEST, so the per-test column is the one that binds:
    //
    //   slowest test in the suite ........... 1884ms  guest-checkout.test.ts
    //   next three, same file ............... 1735 / 1440 / 879ms  (real bcrypt hashing)
    //   root-layout-scripts.test.tsx ........  178ms  <- one of the files that kept FAILING
    //   stability-evidence.test.ts ..........   44ms  <- the other one
    //
    // Read those last two lines twice. The files that blew through a 5000ms timeout are
    // among the FASTEST in the suite: 178ms and 44ms of actual work. Under contention
    // root-layout-scripts was seen past 5000ms — a ~28x inflation — and it failed
    // release-gate verification TWICE, a different test in the file each run. Nothing was
    // wrong with those tests, so no amount of optimising them would have helped.
    //
    // CORRECTION, and why this comment now carries two sets of numbers. The first version
    // claimed a 1200ms worst case and a 12.5x margin. Both were wrong. An independent
    // reviewer re-measured, got 5459ms for guest-checkout, and failed the release for an
    // overstated margin — correctly. Re-measuring on an idle box gives 1884ms: the
    // reviewer's figure was inflated by the load their run sat under, and mine was simply
    // wrong. The honest numbers are above; do not restore the old ones.
    //
    // WHY 15000 AND NOT MORE. It has to absorb contention without going blind to a real
    // regression. Against the 1884ms idle worst case that is a 7.9x margin, and against the
    // worst value ever actually observed for it under heavy load (5459ms) still 2.7x. A
    // test that genuinely becomes slow trips this; a busy CI runner does not fail a passing
    // one. Raising it further trades that signal away for nothing.
    //
    // If a test ever legitimately needs longer, give THAT file its own `vi.setConfig` —
    // do not raise this number. If these figures no longer hold, re-measure with the
    // command above rather than adjusting on intuition.
    testTimeout: 15_000,
  },
});
