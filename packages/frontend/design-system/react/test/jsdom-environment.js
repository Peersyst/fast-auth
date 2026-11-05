const { TestEnvironment } = require("jest-environment-jsdom");

// React's scheduler flushes through setImmediate when it exists, as in Node, so fake timers flush state updates too.
module.exports = class extends TestEnvironment {
    constructor(...args) {
        super(...args);
        Object.assign(this.global, { setImmediate, clearImmediate });
    }
};
