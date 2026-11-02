module.exports = {
    testEnvironment: "<rootDir>/test/jsdom-environment.cjs",
    roots: ["<rootDir>/test"],
    testRegex: ".*\\.spec\\.tsx?$",
    setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
    moduleNameMapper: { "\\.css$": "identity-obj-proxy" },
    transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", module: "commonjs", moduleResolution: "node", esModuleInterop: true } }],
    },
};
