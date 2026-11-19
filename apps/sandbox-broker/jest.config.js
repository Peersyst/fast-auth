module.exports = {
    testEnvironment: "node",
    testRegex: ".*\\.spec\\.ts$",
    transform: { "^.+\\.ts$": "ts-jest" },
    setupFiles: ["<rootDir>/test/env.ts"],
};
