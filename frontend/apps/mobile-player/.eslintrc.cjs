/** @type {import("eslint").Linter.Config} */
module.exports = {
    root: true,
    extends: ["@repo/eslint-config/react"],
    settings: {
        "import/ignore": ["react-native"],
    },
    parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
    },
};
