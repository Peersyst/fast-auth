/**
 * Custom field that renders a NEP-413 signature request (recipient, callback URL, message).
 *
 * When the message carries NEAR Intents the helper breaks them out one by one; otherwise the
 * message is shown verbatim, which is what the standard expects of an arbitrary signed string.
 *
 * Depends on `__auth0FormHelpers`, which is inlined at build time by build.js
 * (or shimmed by the playground via helpers-shim.js).
 */
function AuthorizeAppNep413Details(context) {
    return {
        init: function () {
            const params = context.custom.getParams();
            return __auth0FormHelpers.renderNep413Details({
                fields: [
                    { label: "Recipient", value: params.recipient },
                    { label: "Callback URL", value: params.callbackUrl },
                    { label: "Signer ID", value: params.signerId },
                    { label: "Deadline", value: params.deadline },
                ],
                message: params.message,
                intents: params.intents,
            });
        },
        getScripts: function () { return []; },
        block: function () {},
        unblock: function () {},
        getValue: function () {},
    };
}
