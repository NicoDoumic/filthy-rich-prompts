import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "tests/golden/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "scripts/**/*.mjs"],
    plugins: { unicorn },
    rules: {
      "unicorn/prefer-node-protocol": "error",
      "unicorn/no-instanceof-array": "error",
      "unicorn/prefer-number-properties": "error",
    },
  },
);
