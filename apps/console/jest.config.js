module.exports = {
    preset: "ts-jest",
    roots: ["<rootDir>/test"],
    testRegex: ".*\\.spec\\.ts$",
    testPathIgnorePatterns: ["/node_modules/", "/test/integration/"],
};
