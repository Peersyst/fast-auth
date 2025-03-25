module.exports = {
    extends: ["./.eslintrc.node.js"],
    rules: {},
    overrides: [
        {
            files: ["*.controller.ts"],
            rules: {
                "jsdoc/require-jsdoc": "off",
            },
        },
    ],
};
