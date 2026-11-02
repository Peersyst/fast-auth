const { TestEnvironment } = require("jest-environment-jsdom");

// Jest's jsdom drops Node globals that Vitest's jsdom keeps. The app and its tests use fetch and TextEncoder as a browser
// provides them, and React's scheduler uses setImmediate when it exists, the timing these tests were written against.
module.exports = class extends TestEnvironment {
    constructor(...args) {
        super(...args);
        Object.assign(this.global, { fetch, Request, Response, Headers, TextEncoder, TextDecoder, setImmediate, clearImmediate });
    }
};
