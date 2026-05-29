/**
 * Custom field that renders the transaction details (signer, receiver, actions).
 *
 * Depends on `__auth0FormHelpers`, which is inlined at build time by build.js
 * (or shimmed by the playground via helpers-shim.js).
 */
function AuthorizeAppTransactionDetails(context) {
    return {
        init: function () {
            const params = context.custom.getParams();
            return __auth0FormHelpers.renderDetails({
                fields: [
                    { label: "Signer ID", value: params.signerId },
                    { label: "Receiver ID", value: params.receiverId },
                ],
                actions: params.actions,
                options: { showYoctoConversion: true },
            });
        },
        getScripts: function () { return []; },
        block: function () {},
        unblock: function () {},
        getValue: function () {},
    };
}
