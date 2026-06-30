// CARSI ESLint flat config — RA-3015.
//
// `eslint-config-next` v16 already exports flat-config arrays from
// `core-web-vitals` and `typescript`, so we import them directly
// rather than going through `FlatCompat` (which hits a circular-JSON
// bug in @eslint/eslintrc's config-validator on these configs).
//
// React 19 + react-hooks plugin upgrade introduced several new
// "Cannot call impure function during render" / "Calling setState
// synchronously within an effect" rules that flagged ~50 pre-existing
// violations across the codebase. These are downgraded to warnings
// here so CI is unblocked; the underlying code should be fixed as a
// follow-up sweep (separate ticket).

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
    // #120 (RA-4192) — mechanical lint debt cleared and these rules promoted
    // back to `error`. `no-unused-vars` honours the repo's `_`-prefix
    // convention for intentionally-unused bindings (params kept for a
    // signature, caught-but-unused errors, etc.).
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
      "import/no-anonymous-default-export": "error",
      "prefer-const": "error",
      // #120 — these classes are fully cleared (real fixes where clean, justified
      // per-site eslint-disable where the flagged pattern is legitimate), so
      // they're back to error to stop the debt regrowing:
      "react-hooks/purity": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "@next/next/no-img-element": "error",
    },
  },
  {
    // Rules with no current violations but not part of the #120 sweep — kept as
    // warnings rather than asserting a clean baseline we didn't verify.
    rules: {
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default config;
