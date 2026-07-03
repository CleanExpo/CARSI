// CARSI ESLint flat config — RA-3015.
//
// `eslint-config-next` v16 already exports flat-config arrays from
// `core-web-vitals` and `typescript`, so we import them directly
// rather than going through `FlatCompat` (which hits a circular-JSON
// bug in @eslint/eslintrc's config-validator on these configs).
//
// React 19 + react-hooks plugin upgrade introduced several new
// "Cannot call impure function during render" / "Calling setState
// synchronously within an effect" rules that flagged ~64 pre-existing
// violations across the codebase. RA-4192 cleared them all (real fixes
// where clean, justified per-site eslint-disable where the flagged
// pattern is legitimate) and promoted every temporarily-downgraded rule
// back to `error` so the debt cannot regrow. `npm run lint` is clean.

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "**/*.generated.ts",
      "prisma/migrations/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // RA-4192 — lint debt fully cleared; every rule that was temporarily
    // downgraded to `warn` to unblock CI is back to `error` so the debt
    // cannot regrow. Verified clean at 0 problems before promotion, so no
    // rule below has an outstanding violation. `no-unused-vars` honours the
    // repo's `_`-prefix convention for intentionally-unused bindings (params
    // kept for a signature, caught-but-unused errors, etc.).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "import/no-anonymous-default-export": "error",
      "prefer-const": "error",
      "react/no-unescaped-entities": "error",
      "react-hooks/purity": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "react-hooks/preserve-manual-memoization": "error",
      "react-hooks/static-components": "error",
      "react-hooks/error-boundaries": "error",
      "react-hooks/rules-of-hooks": "error",
      "@next/next/no-img-element": "error",
    },
  },
];

export default config;
