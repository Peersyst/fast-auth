const TRANSFORM_IGNORE_PACKAGES = ["near-api-js", "@noble/curves", "@noble/hashes", "@noble/ciphers", "@scure/base"];

function extractAllowedBody(pattern) {
    const match = pattern.match(/node_modules\/\(\?!(.+)\)[^)]*$/);
    return match ? match[1] : null;
}

module.exports = function createJestConfig(config) {
    const ourBody = TRANSFORM_IGNORE_PACKAGES.join("|");
    const existingBodies = (config.transformIgnorePatterns || []).map(extractAllowedBody).filter(Boolean);
    const combinedBody = [ourBody, ...existingBodies].join("|");

    return {
        ...config,
        transformIgnorePatterns: [`/node_modules/(?!(.+/)?(${combinedBody}))`],
        moduleNameMapper: {
            ...(config.moduleNameMapper || {}),
            "^near-api-js/(?!lib/)(.+)$": "<rootDir>/node_modules/near-api-js/lib/$1/index.js",
            "^near-api-js$": "<rootDir>/node_modules/near-api-js/lib/index.js",
        },
    };
};
