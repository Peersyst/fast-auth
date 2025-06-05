const TRANSACTION_KEY = "transaction";
const IMAGE_URL_KEY = "imageUrl";
const NAME_KEY = "name";

const { Transaction } = require("@near-js/transactions");

function hasKeys(query, keys) {
    return keys.every((k) => k in query);
}

function parseTransaction(txString) {
    return Transaction.decode(Uint8Array.from(txString.split(",").map((value) => Number(value))));
}

/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
    const query = event.request.query;

    if (hasKeys(query, [TRANSACTION_KEY, IMAGE_URL_KEY, NAME_KEY])) {
        const transaction = parseTransaction(event.request.query.transaction);
        console.log(transaction.publicKey, transaction.actions);
        api.prompt.render(event.secrets.authorize_app_modal, {
            fields: {
                imageUrl: event.request.query.imageUrl,
                name: event.request.query.name,
                receiverId: transaction.receiverId,
                signerId: transaction.signerId,
                actions: JSON.stringify(
                    transaction.actions,
                    (_, value) => {
                        if (typeof value == "bigint") {
                            return value.toString();
                        }
                        return value;
                    },
                    2,
                ),
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            event.request.query.transaction.split(",").map((value) => Number(value)),
        );
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
