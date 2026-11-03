Vendored from Unite-Group `packages/premium-visuals` (@cleanexpo/premium-visuals, Unite-Group PR #1340, not yet merged). Do not edit here; update the package and re-sync.

Exception, GP-667: `check-visuals.mjs` was hardened here first (piped JSON completeness, route coverage, comment handling, manifest provenance, allowlist scope, mode labelling). The same changes must be carried into the upstream package before the next re-sync, or the re-sync will undo them. Regression tests: `src/lib/premium-visuals/check-visuals.test.ts` (run by `npm run test:unit`).

`marketing-page.template.tsx.txt` is the default scaffold for every new marketing page (rename to page.tsx once the package components are installed; they are not installed in CARSI yet).
