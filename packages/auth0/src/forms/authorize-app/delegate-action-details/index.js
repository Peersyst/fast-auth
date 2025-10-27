/**
 * This custom field uses imask.js to mask an input with a currency symbol
 * Add "symbol" param using a value like "€" to see the difference
 */
function AuthorizeAppTransactionDetails(context) {
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    function base58Encode(bytes) {
        let result = "";
        let num = BigInt(0);
        // Convert byte array to BigInt
        for (const byte of bytes) {
            num = (num << BigInt(8)) + BigInt(byte);
        }
        // Encode using Base58
        while (num > 0) {
            const remainder = num % BigInt(58);
            num = num / BigInt(58);
            result = ALPHABET[Number(remainder)] + result;
        }
        // Handle leading zeros
        for (const byte of bytes) {
            if (byte === 0) {
                result = ALPHABET[0] + result;
            } else {
                break;
            }
        }
        return result;
    }

    const formatPublicKey = (publicKey) => {
        if (publicKey.secp256k1Key !== undefined) {
            return `secp256k1:${base58Encode(Buffer.from(publicKey.secp256k1Key.data))}`;
        }
        return `ed25519:${base58Encode(Buffer.from(publicKey.ed25519Key.data))}`;
    };

    const createAccountContent = () => {
        const createAccountContent = document.createElement("p");
        createAccountContent.textContent = "By approving this request, a new account will be created.";
        return createAccountContent;
    };

    const deployContractContent = (action) => {
        const deployContractContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = "By approving this request, the compiled smart contract will be deployed.";
        const code = createTextContent("Code", action.deployContract.code ? `${action.deployContract.code.length} bytes` : null);

        deployContractContent.appendChild(text);
        deployContractContent.appendChild(code);
        return deployContractContent;
    };

    const functionCallContent = (action) => {
        const functionCallContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = "By approving this request, the following function will be called.";
        const methodName = createTextContent("Method Name", action.functionCall.methodName);
        const args = createTextContent("Args", Buffer.from(action.functionCall.args).toString());
        const gas = createTextContent("Gas", action.functionCall.gas?.toString());
        const deposit = createTextContent("Deposit", action.functionCall.deposit?.toString());

        functionCallContent.appendChild(text);
        functionCallContent.appendChild(methodName);
        functionCallContent.appendChild(args);
        functionCallContent.appendChild(gas);
        functionCallContent.appendChild(deposit);
        return functionCallContent;
    };

    const transferContent = (action) => {
        const transferContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = "By approving this request, the following amount will be transferred to the receiver.";

        const fields = createTextContent("Deposit", `${action.transfer.deposit?.toString()} yoctoNEAR`);
        transferContent.appendChild(text);
        transferContent.appendChild(fields);
        return transferContent;
    };

    const stakeContent = (action) => {
        const stakeContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = `By approving this request, the following amount will be staked to the public key.`;
        const fields = createTextContent("Stake", `${action.stake.stake?.toString()} yoctoNEAR`);
        const publicKey = createTextContent("Public Key", action.stake.publicKey?.toString());

        stakeContent.appendChild(text);
        stakeContent.appendChild(fields);
        stakeContent.appendChild(publicKey);
        return stakeContent;
    };

    const addKeyContent = (action) => {
        const addKeyContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = `By approving this request, the following access key will be added to your account.`;
        const publicKey = createTextContent("Public Key", formatPublicKey(action.addKey.publicKey));
        const nonce = createTextContent("Nonce", action.addKey.accessKey?.nonce?.toString());

        let permissionContent;
        if (action.addKey.accessKey?.permission?.fullAccess) {
            const warning = document.createElement("div");
            warning.classList.add("warning-callout");
            warning.textContent = "This key will have full access to your account. Only approve if you trust the recipient.";
            permissionContent = warning;
        } else {
            permissionContent = createTextContent("Permission", JSON.stringify(action.addKey.accessKey?.permission?.functionCall, null, 2));
        }

        addKeyContent.appendChild(text);
        addKeyContent.appendChild(publicKey);
        addKeyContent.appendChild(nonce);
        addKeyContent.appendChild(permissionContent);
        return addKeyContent;
    };

    const deleteKeyContent = (action) => {
        const deleteKeyContent = document.createElement("div");

        const text = document.createElement("p");
        text.classList.add("text-content");
        text.textContent = "This action will delete an access key from your account. Only approve if you trust the recipient.";

        const publicKey = createTextContent("Public Key", formatPublicKey(action.deleteKey.publicKey));

        const warning = document.createElement("div");
        warning.classList.add("warning-callout");
        warning.textContent = "Once deleted, the key cannot be recovered.";

        deleteKeyContent.appendChild(text);
        deleteKeyContent.appendChild(publicKey);
        deleteKeyContent.appendChild(warning);
        return deleteKeyContent;
    };

    const deleteAccountContent = (action) => {
        const deleteAccountContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = `By approving this request, the account will be deleted.`;
        const beneficiaryId = createTextContent("Beneficiary ID", action.deleteAccount.beneficiaryId);

        const warning = document.createElement("div");
        warning.classList.add("warning-callout");
        warning.textContent = "Once deleted, the account cannot be recovered.";

        deleteAccountContent.appendChild(text);
        deleteAccountContent.appendChild(beneficiaryId);
        deleteAccountContent.appendChild(warning);
        return deleteAccountContent;
    };

    const signedDelegateContent = (action) => {
        const signedDelegateContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = `By approving this request, the following delegate action will be executed.`;
        const delegateAction = createTextContent("Delegate Action", action.signedDelegate.delegateAction);

        signedDelegateContent.appendChild(text);
        signedDelegateContent.appendChild(delegateAction);
        return signedDelegateContent;
    };

    const deployGlobalContractContent = (action) => {
        const deployGlobalContractContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = `By approving this request, the compiled smart contract will be deployed.`;
        const code = createTextContent(
            "Code",
            action.deployGlobalContract.code ? `${action.deployGlobalContract.code.length} bytes` : null,
        );

        deployGlobalContractContent.appendChild(text);
        deployGlobalContractContent.appendChild(code);
        return deployGlobalContractContent;
    };

    const useGlobalContractContent = (action) => {
        const useGlobalContractContent = document.createElement("div");

        const text = document.createElement("p");
        text.textContent = `By approving this request, the following global contract will be used.`;
        const contractIdentifier = createTextContent("Contract Identifier", action.useGlobalContract.contractIdentifier);

        useGlobalContractContent.appendChild(text);
        useGlobalContractContent.appendChild(contractIdentifier);
        return useGlobalContractContent;
    };

    const handleNearAction = (action) => {
        // Parse the action based on its structure
        let actionType = "Unknown";
        let actionData = {};
        let showWarning = false;

        // Find first defined action to determine type
        const actionKey = Object.keys(action).find((key) => action[key] !== undefined);

        switch (actionKey) {
            case "createAccount":
                actionType = "CreateAccount";
                actionData = createAccountContent();
                break;

            case "deployContract":
                actionType = "DeployContract";
                actionData = deployContractContent(action);
                showWarning = true; // Contract deployment is potentially dangerous
                break;

            case "functionCall":
                actionType = "FunctionCall";
                actionData = functionCallContent(action);
                break;

            case "transfer":
                actionType = "Transfer";
                actionData = transferContent(action);
                break;

            case "stake":
                actionType = "Stake";
                actionData = stakeContent(action);
                break;

            case "addKey":
                actionType = "AddKey";
                actionData = addKeyContent(action);
                // Show warning if it's a full access key
                showWarning = action.addKey.accessKey?.permission?.fullAccess !== undefined;
                break;

            case "deleteKey":
                actionType = "DeleteKey";
                actionData = deleteKeyContent(action);
                showWarning = true; // Deleting keys can lock you out
                break;

            case "deleteAccount":
                actionType = "DeleteAccount";
                actionData = deleteAccountContent(action);
                showWarning = true; // Account deletion is irreversible
                break;

            case "signedDelegate":
                actionType = "SignedDelegate";
                actionData = signedDelegateContent(action);
                break;

            case "deployGlobalContract":
                actionType = "DeployGlobalContract";
                actionData = deployGlobalContractContent(action);
                showWarning = true; // Global contract deployment is potentially dangerous
                break;

            case "useGlobalContract":
                actionType = "UseGlobalContract";
                actionData = useGlobalContractContent(action);
                break;
        }

        return createAccordion(actionType, actionData, showWarning);
    };

    const createAccordion = (label, content, showWarning = false) => {
        const accordion = document.createElement("div");
        accordion.classList.add("accordion");

        const header = document.createElement("div");
        header.classList.add("accordion-header");

        const headerContent = document.createElement("div");
        headerContent.classList.add("accordion-header-content");

        const leftContent = document.createElement("div");
        leftContent.classList.add("accordion-left-content");

        if (showWarning) {
            const warningIcon = document.createElement("span");
            warningIcon.classList.add("warning-icon");
            warningIcon.innerHTML = "⚠️";
            leftContent.appendChild(warningIcon);
        }

        const labelElement = document.createElement("span");
        labelElement.classList.add("accordion-header-label");
        labelElement.textContent = label;
        leftContent.appendChild(labelElement);

        const expandIcon = document.createElement("span");
        expandIcon.classList.add("expand-icon");
        expandIcon.innerHTML = "+";

        headerContent.appendChild(leftContent);
        headerContent.appendChild(expandIcon);
        header.appendChild(headerContent);

        const contentElement = document.createElement("div");
        contentElement.classList.add("accordion-content");
        contentElement.appendChild(content);

        accordion.appendChild(header);
        accordion.appendChild(contentElement);

        header.addEventListener("click", () => {
            contentElement.classList.toggle("open");
            // Toggle the expand icon
            if (contentElement.classList.contains("open")) {
                expandIcon.innerHTML = "−";
            } else {
                expandIcon.innerHTML = "+";
            }
        });

        return accordion;
    };

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

    return {
        /** Invoked once when the field is created */
        init() {
            const box = document.createElement("div");
            box.classList.add("box");

            const config = context.custom.getParams();
            const { signerId, receiverId, actions } = config;

            const sender = createTextContent("Signer ID", signerId);
            const receiver = createTextContent("Receiver ID", receiverId);

            const parsedActions = JSON.parse(actions);
            const actionAccordions = [];

            for (const action of parsedActions) {
                const accordion = handleNearAction(action);
                actionAccordions.push(accordion);
            }

            box.appendChild(sender);
            box.appendChild(receiver);

            const actionsContainer = document.createElement("div");
            actionsContainer.classList.add("actions-container");
            const actionsLabel = document.createElement("div");
            actionsLabel.classList.add("label");
            actionsLabel.textContent = "Actions";
            actionsContainer.appendChild(actionsLabel);

            actionAccordions.forEach((accordion) => {
                actionsContainer.appendChild(accordion);
            });

            box.appendChild(actionsContainer);

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
