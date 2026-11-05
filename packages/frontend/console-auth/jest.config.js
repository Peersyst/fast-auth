const createJestConfig = require("@shared/jest-config");

const config = {
    testEnvironment: "<rootDir>/test/jsdom-environment.js",
    moduleFileExtensions: ["js", "ts"],
    rootDir: ".",
    testRegex: ".*\\.spec\\.ts$",
    transform: {
        "^.+\\.(ts|js)$": "ts-jest",
    },
    collectCoverageFrom: ["./src/**/*.ts"],
    coverageThreshold: {
        global: {
            branches: 0,
            statements: 0,
        },
    },
};

module.exports = createJestConfig(config);
