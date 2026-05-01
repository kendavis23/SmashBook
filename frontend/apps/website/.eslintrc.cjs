module.exports = {
    root: true,
    extends: ["@repo/eslint-config/react"],
    parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
    },
};
