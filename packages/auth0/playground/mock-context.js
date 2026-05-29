/**
 * Mock of the Auth0 form-runtime `context` object passed to custom field factories.
 * Only the methods that production details/index.js touch are implemented.
 */
(function (global) {
    "use strict";

    function createMockContext(params) {
        return {
            custom: {
                getParams: function () {
                    return params || {};
                },
                getValue: function (key) {
                    return params ? params[key] : undefined;
                },
            },
        };
    }

    global.createMockContext = createMockContext;
})(window);
