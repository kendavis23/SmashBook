/** @type {import("eslint").Linter.Config} */
module.exports = {
    extends: [
        "./base.js",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
    ],
    plugins: ["react", "react-hooks"],
    rules: {
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
    },
    settings: {
        react: {
            version: "18.3.1",
        },
    },
    env: {
        browser: true,
    },
};
