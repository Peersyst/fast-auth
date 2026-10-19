/**
 * Custom field that renders the NEP-413 message details (recipient, callback URL, message).
 *
 * Depends on `__auth0FormHelpers`, which is inlined at build time by build.js.
 */
function AuthorizeAppMessageDetails(context) {
    return {
        init: function () {
            const params = context.custom.getParams();

            const box = document.createElement("div");
            box.classList.add("box");

            box.appendChild(__auth0FormHelpers.createTextContent("Recipient", params.recipient));
            if (params.callbackUrl) {
                box.appendChild(__auth0FormHelpers.createTextContent("Callback URL", params.callbackUrl));
            }

            const messageContainer = document.createElement("div");
            messageContainer.classList.add("message-container");

            const messageLabel = document.createElement("div");
            messageLabel.classList.add("label");
            messageLabel.textContent = "Message";
            messageContainer.appendChild(messageLabel);

            const messageBody = document.createElement("pre");
            messageBody.classList.add("message-body");
            messageBody.textContent = params.message;
            messageContainer.appendChild(messageBody);

            box.appendChild(messageContainer);

            const note = document.createElement("div");
            note.classList.add("message-note");
            note.textContent =
                "Some apps and contracts accept a signed message as permission to act for you, including moving funds. Only sign if you trust this site and understand the message.";
            box.appendChild(note);

            return box;
        },
        getScripts: function () { return []; },
        block: function () {},
        unblock: function () {},
        getValue: function () {},
    };
}
