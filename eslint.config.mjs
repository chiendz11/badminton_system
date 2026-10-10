import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/generated/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["apps/*/**/*.{js,jsx}"],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.jest },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["apps/*/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["apps/*/src/features/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "@/pages/**", "**/app/**"],
              message: "Features must not depend on app composition or pages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/*/src/shared/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/**",
                "@/pages/**",
                "@/features/**",
                "**/app/**",
                "**/features/**",
              ],
              message: "Shared code must not depend on application features.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/*/src/features/**/ui/*.tsx", "apps/*/src/pages/**/*.tsx"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "HTTP belongs in feature API adapters." },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "api",
          property: "call",
          message: "Call a feature model or API adapter instead of HTTP in UI.",
        },
      ],
    },
  },
  {
    files: ["services/booking-core/src/common/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/modules/**",
                "**/infrastructure/**",
                "**/generated/**",
              ],
              message:
                "Common policies must not depend on feature modules or persistence.",
            },
          ],
        },
      ],
    },
  },
);
