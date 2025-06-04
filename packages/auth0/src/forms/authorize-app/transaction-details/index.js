/**
 * This custom field uses imask.js to mask an input with a currency symbol
 * Add "symbol" param using a value like "€" to see the difference
 */
function AuthorizeAppTransactionDetails(context) {
    const createTextContent = (label, value, link = false) => {
        const textContent = document.createElement("div");
        textContent.classList.add("text-content");

        const labelElement = document.createElement("div");
        labelElement.classList.add("label");
        labelElement.textContent = label;

        const valueElement = document.createElement("div");
        valueElement.classList.add("value");
        valueElement.textContent = value;

        if (link) {
            valueElement.classList.add("link");
            valueElement.setAttribute("href", link);
            valueElement.setAttribute("target", "_blank");
        }

        textContent.appendChild(labelElement);
        textContent.appendChild(valueElement);

        return textContent;
    };

    const createJsonContent = (label, value) => {
        const textContent = document.createElement("div");
        textContent.classList.add("text-content");

        const labelElement = document.createElement("div");
        labelElement.classList.add("label");
        labelElement.textContent = label;

        const valueElement = document.createElement("div");
        valueElement.classList.add("json-content");
        valueElement.textContent = value;

        textContent.appendChild(labelElement);
        textContent.appendChild(valueElement);

        return textContent;
    };

    return {
        /** Invoked once when the field is created */
        init() {
            const box = document.createElement("div");
            box.classList.add("box");

            const config = context.custom.getParams();
            const { signerId, publicKey, receiverId, actions } = config;

            const sender = createTextContent("Signer ID", signerId);
            const receiver = createTextContent("Receiver ID", receiverId);
            const publicKeyContent = createTextContent("Public Key", publicKey);
            const actionsContent = createJsonContent("Actions", actions);

            box.appendChild(sender);
            box.appendChild(receiver);
            box.appendChild(publicKeyContent);
            box.appendChild(actionsContent);
            return box;
        },

        /** Returns a list of URLs that the SDK guarantees that will loaded before init() is invoked */
        getScripts() {
            return [];
        },

        /** Invoked when field has to be blocked */
        block() {},

        /** Invoked when field has to be unblocked */
        unblock() {},

        /** Invoked when the SDK needs to get the value (possibly several times) */
        getValue() {},
    };
}
