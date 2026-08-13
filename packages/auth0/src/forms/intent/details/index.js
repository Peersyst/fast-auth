/**
 * Custom field that renders the NEP-413 intent details (signer, verifier, deadline, intents).
 *
 * Depends on `__auth0FormHelpers`, which is inlined at build time by build.js
 * (or shimmed by the playground via helpers-shim.js).
 */
function AuthorizeAppIntentDetails(context) {
    return {
        init: function () {
            const params = context.custom.getParams();
            return __auth0FormHelpers.renderIntentDetails({
                fields: [
                    { label: "Signer ID", value: params.signerId },
                    { label: "Verifier", value: params.recipient },
                    { label: "Deadline", value: params.deadline },
                ],
                intents: params.intents,
            });
        },
        getScripts: function () { return []; },
        block: function () {},
        unblock: function () {},
        getValue: function () {},
    };
}
