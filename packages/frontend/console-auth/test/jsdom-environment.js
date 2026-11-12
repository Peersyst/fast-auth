const { TestEnvironment } = require("jest-environment-jsdom");

// jsdom leaves out the Node globals the Auth0 SDK uses as a browser provides them.
module.exports = class extends TestEnvironment {
    constructor(...args) {
        super(...args);
        Object.assign(this.global, { TextEncoder, TextDecoder });
    }
};
