const path = require("path");
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const frontendGlobs = [
  "app/**/*.{js,jsx,ts,tsx}",
  "src/**/*.{js,jsx,ts,tsx}",
];

module.exports = [
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/.turbo/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "e2e/**",
    ],
  },

  // Base config for Next.js app (root)
  ...compat
    .extends("next/core-web-vitals", "plugin:@typescript-eslint/recommended")
    .map((config) => ({
      ...config,
      files: frontendGlobs,
    })),

  // Production code overrides
  {
    files: frontendGlobs,
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Test files - relaxed rules
  {
    files: [
      "src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "src/**/*.test.{js,jsx,ts,tsx}",
      "src/**/*.spec.{js,jsx,ts,tsx}",
      "tests/**/*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
