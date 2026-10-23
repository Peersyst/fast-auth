module.exports = {
    root: true,
    extends: [require.resolve("@shared/eslint/nest")],
    parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
    },
    rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "jsdoc/require-jsdoc": "off",
    },
    ignorePatterns: ["web/", "src/database/migrations/", "/*.js", "dist", "coverage"],
};
