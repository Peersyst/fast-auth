const { getRequireJSDocConfig } = require("./utils/jsdoc");

const jsdocConfig = getRequireJSDocConfig();

module.exports = {
    plugins: ["import"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:jsdoc/recommended-typescript-error",
        "plugin:prettier/recommended",
    ],
    rules: {
        "import/no-unresolved": "error",
        "import/no-extraneous-dependencies": "error",
        "import/newline-after-import": ["error", { considerComments: true }],
        "no-console": "warn",
        "no-empty": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-require-imports": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            },
        ],
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/explicit-member-accessibility": [
            "error",
            {
                accessibility: "no-public",
            },
        ],
        "jsdoc/require-description": "error",
        "jsdoc/require-param": [
            "error",
            {
                checkDestructured: false,
            },
        ],
        "jsdoc/check-param-names": [
            "error",
            {
                checkDestructured: false,
            },
        ],
        "jsdoc/require-hyphen-before-param-description": ["error", "never"],
        "jsdoc/require-jsdoc": ["error", jsdocConfig],
        "jsdoc/match-description": [
            "error",
            {
                message: "Needs to begin with a capital letter and end with an end mark.",
                matchDescription: "^(?:[A-Z]|`).*\\.(?:\n.*)*",
                tags: {
                    param: true,
                    returns: true,
                },
            },
        ],
        "jsdoc/check-tag-names": [
            "error",
            {
                definedTags: ["pre"],
            },
        ],
    },
    env: {
        node: true,
    },
    settings: {
        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },
        "import/resolver": {
            typescript: {
                alwaysTryTypes: true,
            },
        },
    },
    ignorePatterns: ["dist"],
};
