module.exports = {
    testEnvironment: "jsdom",
    moduleFileExtensions: ["js", "json"],
    rootDir: ".",
    testRegex: ".*\\.spec\\.js$",
    collectCoverageFrom: ["./src/**/*.js"],
    coverageThreshold: {
        global: {
            branches: 0,
            statements: 0,
        },
    },
};
