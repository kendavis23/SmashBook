/** @type {import("eslint").Linter.Config} */
module.exports = {
    extends: ["eslint:recommended", "prettier"],
    plugins: ["@typescript-eslint", "import"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    ignorePatterns: ["**/*.d.ts"],
    rules: {
        "no-console": "error",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-non-null-assertion": "warn",
        "import/no-cycle": "error",
    },
    env: {
        node: true,
        es2022: true,
    },
};
