const TRANSACTION_KEY = "transaction";
const IMAGE_URL_KEY = "imageUrl";
const NAME_KEY = "name";
const RECEIVER_ID_KEY = "receiverId";
const ACTIONS_KEY = "actions";

function hasKeys(query, keys) {
    return keys.every((k) => k in query);
}

/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
    const query = event.request.query;

    if (hasKeys(query, [TRANSACTION_KEY, IMAGE_URL_KEY, NAME_KEY, RECEIVER_ID_KEY, ACTIONS_KEY])) {
        api.prompt.render(event.secrets.transaction_modal, {
            fields: {
                imageUrl: event.request.query.imageUrl,
                name: event.request.query.name,
                transaction: event.request.query.transaction,
                receiverId: event.request.query.receiverId,
                actions: event.request.query.actions,
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            event.request.query.transaction.split(",").map((value) => Number(value)),
        );
    } else {
        api.prompt.render(event.secrets.login_modal, {
            fields: {
                imageUrl: event.request.query.imageUrl || "",
                name: event.request.query.name || "",
            },
        });
    }
};

/**
 * Handler that will be invoked when this action is resuming after an external redirect. If your
 * onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onContinuePostLogin = async (event, api) => {};
