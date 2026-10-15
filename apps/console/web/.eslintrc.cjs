module.exports = {
    root: true,
    extends: [require.resolve("@shared/eslint/react")],
    parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
    },
    ignorePatterns: ["dist", "src/api/schema.gen.ts"],
    rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "react-hooks/exhaustive-deps": "error",
        "jsdoc/require-jsdoc": "off",
    },
};
