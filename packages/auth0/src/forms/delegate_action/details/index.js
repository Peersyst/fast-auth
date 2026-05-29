/**
 * Custom field that renders the delegate action details (sender, receiver, max block height, actions).
 *
 * Depends on `__auth0FormHelpers`, which is inlined at build time by build.js
 * (or shimmed by the playground via helpers-shim.js).
 */
function AuthorizeAppDelegateActionDetails(context) {
    return {
        init: function () {
            const params = context.custom.getParams();
            return __auth0FormHelpers.renderDetails({
                fields: [
                    { label: "Sender ID", value: params.senderId },
                    { label: "Receiver ID", value: params.receiverId },
                    { label: "Max Block Height", value: params.maxBlockHeight },
                ],
                actions: params.actions,
                options: { showYoctoConversion: false },
            });
        },
        getScripts: function () { return []; },
        block: function () {},
        unblock: function () {},
        getValue: function () {},
    };
}
