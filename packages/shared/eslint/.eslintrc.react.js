const { getRequireJSDocConfig } = require("./utils/jsdoc");

// Do not require JSDoc for React components (functions starting with a capital letter).
const tsxJsdocConfig = getRequireJSDocConfig({
    selectors: {
        FunctionDeclaration: "[id.name!=/^[A-Z]/]",
        ArrowFunctionExpression: "[parent.id.name!=/^[A-Z]/]",
        FunctionExpression: "[parent.id.name!=/^[A-Z]/]",
    },
});

module.exports = {
    extends: ["./.eslintrc.base.js", "plugin:react/recommended", "plugin:react/jsx-runtime", "plugin:react-hooks/recommended"],
    plugins: ["react"],
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 2021,
        sourceType: "module",
    },
    rules: {
        "react-hooks/exhaustive-deps": "off",
        "react/no-unknown-property": ["error", { ignore: ["css"] }],
    },
    overrides: [
        {
            files: ["*.tsx"],
            rules: {
                "jsdoc/require-jsdoc": ["error", tsxJsdocConfig],
            },
        },
    ],
    env: {
        browser: true,
        node: true,
    },
    settings: {
        react: {
            pragma: "React",
            version: "detect",
        },
    },
};
