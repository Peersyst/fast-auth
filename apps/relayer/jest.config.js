module.exports = {
    testEnvironment: "node",
    moduleFileExtensions: ["js", "ts"],
    rootDir: ".",
    testRegex: ".*\\.spec\\.ts$",
    transform: {
        "^.+\\.ts$": "ts-jest",
    },
    collectCoverageFrom: [
        "./src/modules/**/*.ts",
        "!./src/modules/**/*.controller.ts",
        "!./src/modules/**/*.request.ts",
        "!./src/modules/**/*.dto.ts",
        "!./src/modules/auth/guards/**/*.ts",
        "!./src/modules/auth/strategies/**/*.ts",
        "!./src/modules/auth/auth.decorator.ts",
        "!./src/modules/common/exception/**/*.ts",
        "!./src/modules/**/*.module.ts",
    ],
    coverageThreshold: {
        global: {
            branches: 0,
            statements: 0,
        },
    },
};
