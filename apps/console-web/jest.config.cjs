const createJestConfig = require("@shared/jest-config");

const config = {
    testEnvironment: "<rootDir>/test/jsdom-environment.cjs",
    moduleFileExtensions: ["js", "ts", "tsx", "jsx"],
    rootDir: ".",
    testRegex: ".*\\.spec\\.tsx?$",
    setupFilesAfterEnv: ["./test/setup.tsx"],
    transform: {
        "\\.[jt]sx?$": ["ts-jest", { tsconfig: "./tsconfig.app.json" }],
    },
    moduleNameMapper: {
        "\\.css$": "identity-obj-proxy",
    },
};

module.exports = createJestConfig(config);
