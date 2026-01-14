module.exports = {
    root: true,
    extends: [require.resolve("@shared/eslint/nest")],
    rules: {
        "jsdoc/require-jsdoc": "off",
        "jsdoc/require-param": "off",
        "jsdoc/require-returns": "off",
        "jsdoc/match-description": "off",
    }
};
