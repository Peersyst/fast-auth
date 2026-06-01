/**
 * Mock of the Auth0 form-runtime `context` object passed to custom field factories.
 * Only the methods that production details/index.js touch are implemented.
 */
(function (global) {
    "use strict";

    function createMockContext(params, onForm) {
        const hidden = {};
        const notify = typeof onForm === "function" ? onForm : function () {};
        return {
            custom: {
                getParams: function () {
                    return params || {};
                },
                getValue: function (key) {
                    return params ? params[key] : undefined;
                },
            },
            // Minimal mock of context.form. Production uses setHiddenField + goForward to
            // record the Approve/Deny choice; in the playground we just surface it visually.
            form: {
                setHiddenField: function (id, value) {
                    hidden[id] = value;
                    notify("setHiddenField", { id: id, value: value });
                },
                goForward: function () {
                    notify("goForward", { hidden: Object.assign({}, hidden) });
                },
                goPrevious: function () {
                    notify("goPrevious", {});
                },
            },
        };
    }

    global.createMockContext = createMockContext;
})(window);
