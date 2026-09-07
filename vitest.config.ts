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
    // DO NOT quote a single run's milliseconds here. Per-test timings in this suite are not
    // reproducible: measured across FIVE full-suite runs on 2026-09-07 (1365 passed / 0
    // failed every time, `npx vitest run --reporter=json`, loads 4.9 to 16.9), the same test
    // varies by up to 8.8x between runs at comparable load. A point value is refutable by
    // anyone who runs it once — which is exactly how two release reviews were failed here.
    // The defensible claim is a BOUND over a stated number of runs, so that is what follows.
    // Repeated runs do not make the measurement reproducible; they characterise the scatter,
    // and it is the scatter that decides a safe timeout.
    //
    //   test                        min      max    spread   (5 runs, per-test max)
    //   guest-checkout.test.ts    2059ms   3511ms     1.7x   <- slowest in the suite
    //   root-layout-scripts.tsx    202ms    623ms     3.1x   <- one that kept FAILING
    //   stability-evidence.ts       16ms    141ms     8.8x   <- the other one
    //
    // The point that survives every run: the two files that blew through a 5000ms timeout do
    // well under a second of work even at their slowest. Optimising them — the obvious fix,
    // and the one first proposed — would have achieved nothing, because the failure was
    // never their own runtime.
    //
    // WHY 15000. Worst single test ever observed anywhere is 5459ms (independent reviewer,
    // load ~45); worst across these five runs is 3511ms. 15000 leaves 2.7x over the worst
    // known and 4.3x over the worst measured here, while still catching a test that truly
    // hangs. Both figures are stated because the wider one is what the setting must survive.
    //
    // TWO EARLIER VERSIONS OF THIS COMMENT WERE WRONG, in the same way. The first claimed a
    // 1200ms worst case and a 12.5x margin; the second "corrected" it to 1884ms and 7.9x.
    // Both quoted one run. The real worst case is above both. Do not restore either, and do
    // not replace this block with a fresh single measurement — re-run the suite several
    // times and update the bound.
    //
    // If a test ever legitimately needs longer, give THAT file its own `vi.setConfig` —
    // do not raise this number.
    testTimeout: 15_000,
  },
});
