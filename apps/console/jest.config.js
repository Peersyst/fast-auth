module.exports = {
    preset: "ts-jest",
    roots: ["<rootDir>/src"],
    testRegex: ".*\\.spec\\.ts$",
    collectCoverageFrom: ["<rootDir>/src/domain/**/*.ts"],
    coverageThreshold: {
        "./src/domain/": {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
};
