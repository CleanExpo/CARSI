// CARSI ESLint flat config — RA-3015.
//
// ESLint v9 dropped support for legacy `.eslintrc.*` files; the project
// now needs a flat config. We use `FlatCompat` to bridge the Next.js
// presets (which still ship as the legacy format) into the flat-config
// world without rewriting them.
//
// Companion to the PR #110 fix that flipped the `lint` script from
// `next lint` (broken in Next 16) to `eslint .`. With both changes,
// `npm run lint` works in CI again.

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

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
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
