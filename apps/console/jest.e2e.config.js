module.exports = {
    preset: "ts-jest",
    roots: ["<rootDir>/test"],
    testRegex: ".*\\.e2e-spec\\.ts$",
    setupFiles: ["<rootDir>/test/utils/load-env.ts"],
    globalSetup: "<rootDir>/test/utils/global-setup.ts",
};
