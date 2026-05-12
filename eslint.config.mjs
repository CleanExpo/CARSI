// CARSI ESLint flat config — RA-3015.
//
// `eslint-config-next` v16 already exports flat-config arrays from
// `core-web-vitals` and `typescript`, so we import them directly
// rather than going through `FlatCompat` (which hits a circular-JSON
// bug in @eslint/eslintrc's config-validator on these configs).

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
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
];
