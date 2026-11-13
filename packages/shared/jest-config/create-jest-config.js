const TRANSPILED_PACKAGES = ["near-api-js", "@noble/curves", "@noble/hashes", "@noble/ciphers", "@scure/base"];

module.exports = function createJestConfig(config) {
    return {
        ...config,
        transformIgnorePatterns: [`/node_modules/(?!(.+/)?(${TRANSPILED_PACKAGES.join("|")}))`],
        moduleNameMapper: {
            ...(config.moduleNameMapper || {}),
            "^near-api-js/(?!lib/)(.+)$": "<rootDir>/node_modules/near-api-js/lib/$1/index.js",
            "^near-api-js$": "<rootDir>/node_modules/near-api-js/lib/index.js",
        },
    };
};
