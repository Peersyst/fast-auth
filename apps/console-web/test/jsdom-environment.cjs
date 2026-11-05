const { TestEnvironment } = require("jest-environment-jsdom");

// jsdom leaves out Node globals the app uses as a browser provides them: the encoders, and the fetch API the generated
// client sends requests with. setImmediate is added back so React's scheduler flushes through it, as it does in Node.
module.exports = class extends TestEnvironment {
    constructor(...args) {
        super(...args);
        Object.assign(this.global, { TextEncoder, TextDecoder, setImmediate, clearImmediate, fetch, Headers, Request, Response });
    }
};
