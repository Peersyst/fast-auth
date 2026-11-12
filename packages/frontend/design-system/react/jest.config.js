const createJestConfig = require("@shared/jest-config");

const config = {
    testEnvironment: "<rootDir>/test/jsdom-environment.js",
    moduleFileExtensions: ["js", "ts", "tsx"],
    rootDir: ".",
    testRegex: ".*\\.spec\\.tsx?$",
    setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
    transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", esModuleInterop: true, experimentalDecorators: true } }],
    },
};

module.exports = createJestConfig(config);
