/**
 * Shared helpers for Auth0 form custom components.
 *
 * Runs in two environments:
 *   - Auth0 form runtime: build.js inlines this file into each component's `config.code`,
 *     exposing `__auth0FormHelpers` as a top-level variable in the same scope as the component.
 *   - Node (tests / playground via require): consumed as a CommonJS module via module.exports.
 *
 * Keep this file free of `require` and ES imports so it can be concatenated as plain text.
 */

function ensureBufferPolyfill() {
    if (typeof Buffer !== "undefined") return;
    if (typeof globalThis === "undefined") return;
    globalThis.Buffer = {
        from: function (data) {
            if (Array.isArray(data)) return new Uint8Array(data);
            if (typeof data === "string") return new TextEncoder().encode(data);
            return data;
        },
    };
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes) {
    let result = "";
    let num = BigInt(0);
    for (const byte of bytes) {
        num = (num << BigInt(8)) + BigInt(byte);
    }
    while (num > BigInt(0)) {
        const remainder = num % BigInt(58);
        num = num / BigInt(58);
        result = BASE58_ALPHABET[Number(remainder)] + result;
    }
    for (const byte of bytes) {
        if (byte === 0) result = BASE58_ALPHABET[0] + result;
        else break;
    }
    return result;
}

/**
 * Format a yocto-NEAR BigInt string as NEAR with up to 8 decimals.
 * "1000000000000000000000000" -> "1"
 * "1500000000000000000000000" -> "1.5"
 * "1" -> "0.00000000" trimmed -> "0.0"
 */
function yoctoToNear(bigIntStr) {
    const trimmed = String(bigIntStr).replace(/^0+/, "") || "0";
    const length = trimmed.length;

    if (length <= 24) {
        const zerosNeeded = 24 - length;
        const withZeros = "0".repeat(zerosNeeded) + trimmed;
        const decimals = withZeros.slice(0, 8).replace(/0+$/, "") || "0";
        return `0.${decimals}`;
    }

    const splitPos = length - 24;
    const integerPart = trimmed.slice(0, splitPos);
    const decimalPart = trimmed.slice(splitPos, splitPos + 8);
    const trimmedDecimals = decimalPart.replace(/0+$/, "");
    if (trimmedDecimals === "") return integerPart;
    return `${integerPart}.${trimmedDecimals}`;
}

function formatPublicKey(publicKey) {
    if (publicKey && publicKey.secp256k1Key !== undefined) {
        return `secp256k1:${base58Encode(publicKey.secp256k1Key.data)}`;
    }
    if (publicKey && publicKey.ed25519Key !== undefined) {
        return `ed25519:${base58Encode(publicKey.ed25519Key.data)}`;
    }
    return "";
}

/**
 * Return the canonical action type discriminator (the single non-undefined key of the action).
 * Useful for dispatch and for tests that don't need DOM rendering.
 */
function getActionType(action) {
    if (!action || typeof action !== "object") return null;
    for (const key of Object.keys(action)) {
        if (action[key] !== undefined) return key;
    }
    return null;
}

// --- DOM helpers (require document/window — jsdom in tests, real DOM in browser) ---

function createTextContent(label, value, link = false) {
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
}

function createDescription(text) {
    const node = document.createElement("p");
    node.classList.add("action-description");
    node.textContent = text;
    return node;
}

function createAccordion(label, content, showWarning = false) {
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
        warningIcon.innerHTML = "&#9888;&#65039;";
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

    header.addEventListener("click", function () {
        contentElement.classList.toggle("open");
        expandIcon.innerHTML = contentElement.classList.contains("open") ? "−" : "+";
    });

    return accordion;
}

// --- Action content factories ---

function createAccountContent() {
    return createDescription("By approving this request, a new account will be created.");
}

function deployContractContent(action) {
    ensureBufferPolyfill();
    const container = document.createElement("div");
    const text = createDescription("By approving this request, the compiled smart contract will be deployed.");
    const codeLen = action.deployContract && action.deployContract.code ? `${action.deployContract.code.length} bytes` : null;
    container.appendChild(text);
    container.appendChild(createTextContent("Code", codeLen));
    return container;
}

/**
 * Decode functionCall `args` (a byte array / Uint8Array) to a readable string. NEAR contract
 * args are almost always UTF-8 JSON, so decode the bytes and pretty-print when they parse as
 * JSON; otherwise fall back to the raw decoded text. TextDecoder is used directly because it
 * exists in the browser and the Auth0 form runtime (unlike Buffer, which the runtime lacks).
 */
function decodeFunctionCallArgs(args) {
    if (args == null) return "";
    let text;
    try {
        if (typeof TextDecoder !== "undefined") {
            text = new TextDecoder().decode(Uint8Array.from(args));
        } else if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
            text = Buffer.from(args).toString("utf8");
        } else {
            text = String.fromCharCode.apply(null, Array.from(args));
        }
    } catch (e) {
        return "<unreadable>";
    }
    try {
        return JSON.stringify(JSON.parse(text), null, 2);
    } catch (e) {
        return text;
    }
}

/**
 * Format a yocto-NEAR amount for display. In transaction mode (showYoctoConversion) amounts at or
 * above 0.00000000001 NEAR are shown as NEAR; smaller amounts and delegate-action mode stay in
 * yoctoNEAR so no precision is hidden.
 */
function formatNearAmount(value, options) {
    const showYoctoConversion = !!(options && options.showYoctoConversion);
    if (showYoctoConversion && value != null && BigInt(value) >= BigInt("10000000000000000")) {
        return `${yoctoToNear(value.toString())} NEAR`;
    }
    return `${value != null ? value.toString() : "0"} yoctoNEAR`;
}

function functionCallContent(action, options) {
    const container = document.createElement("div");
    const text = createDescription("By approving this request, the following function will be called.");

    const fc = action.functionCall || {};
    container.appendChild(text);
    container.appendChild(createTextContent("Method Name", fc.methodName));
    container.appendChild(createTextContent("Args", decodeFunctionCallArgs(fc.args)));
    container.appendChild(createTextContent("Gas", fc.gas != null ? fc.gas.toString() : ""));
    container.appendChild(createTextContent("Deposit", formatNearAmount(fc.deposit, options)));
    return container;
}

function transferContent(action, options) {
    const container = document.createElement("div");
    const text = createDescription("By approving this request, the following amount will be transferred to the receiver.");

    const deposit = action.transfer ? action.transfer.deposit : undefined;
    container.appendChild(text);
    container.appendChild(createTextContent("Deposit", formatNearAmount(deposit, options)));
    return container;
}

function stakeContent(action, options) {
    const container = document.createElement("div");
    const text = createDescription("By approving this request, the following amount will be staked to the public key.");
    const stake = action.stake || {};
    container.appendChild(text);
    container.appendChild(createTextContent("Stake", formatNearAmount(stake.stake, options)));
    container.appendChild(createTextContent("Public Key", formatPublicKey(stake.publicKey)));
    return container;
}

function addKeyContent(action) {
    const container = document.createElement("div");
    const ak = action.addKey || {};
    const accessKey = ak.accessKey || {};
    const permission = accessKey.permission || {};

    if (permission.fullAccess !== undefined) {
        const warning = document.createElement("div");
        warning.classList.add("warning-callout");
        warning.textContent = "This key will have full access to your account. Only approve if you trust the recipient.";
        container.appendChild(warning);
    }

    container.appendChild(createDescription("By approving this request, the following access key will be added to your account."));
    container.appendChild(createTextContent("Public Key", formatPublicKey(ak.publicKey)));
    container.appendChild(createTextContent("Nonce", accessKey.nonce != null ? accessKey.nonce.toString() : ""));

    if (permission.fullAccess === undefined) {
        container.appendChild(createTextContent("Permission", JSON.stringify(permission.functionCall, null, 2)));
    }
    return container;
}

function deleteKeyContent(action) {
    const container = document.createElement("div");
    const dk = action.deleteKey || {};

    const warning = document.createElement("div");
    warning.classList.add("warning-callout");
    warning.textContent = "Once deleted, the key cannot be recovered.";

    container.appendChild(warning);
    container.appendChild(
        createDescription("This action will delete an access key from your account. Only approve if you trust the recipient."),
    );
    container.appendChild(createTextContent("Public Key", formatPublicKey(dk.publicKey)));
    return container;
}

function deleteAccountContent(action) {
    const container = document.createElement("div");

    const warning = document.createElement("div");
    warning.classList.add("warning-callout");
    warning.textContent = "Once deleted, the account cannot be recovered.";

    container.appendChild(warning);
    container.appendChild(createDescription("By approving this request, the account will be deleted."));
    container.appendChild(createTextContent("Beneficiary ID", action.deleteAccount && action.deleteAccount.beneficiaryId));
    return container;
}

function signedDelegateContent(action) {
    const container = document.createElement("div");
    const text = createDescription("By approving this request, the following delegate action will be executed.");

    const sd = action.signedDelegate || {};
    let serialized;
    try {
        serialized = JSON.stringify(
            sd.delegateAction,
            function (_, value) {
                return typeof value === "bigint" ? value.toString() : value;
            },
            2,
        );
    } catch (e) {
        serialized = "<unserializable>";
    }
    container.appendChild(text);
    container.appendChild(createTextContent("Delegate Action", serialized));
    return container;
}

function deployGlobalContractContent(action) {
    const container = document.createElement("div");
    const text = createDescription("By approving this request, the compiled smart contract will be deployed.");
    const codeLen =
        action.deployGlobalContract && action.deployGlobalContract.code ? `${action.deployGlobalContract.code.length} bytes` : null;
    container.appendChild(text);
    container.appendChild(createTextContent("Code", codeLen));
    return container;
}

function useGlobalContractContent(action) {
    const container = document.createElement("div");
    const text = createDescription("By approving this request, the following global contract will be used.");
    let identifier;
    try {
        identifier = JSON.stringify(action.useGlobalContract && action.useGlobalContract.contractIdentifier);
    } catch (e) {
        identifier = "<unserializable>";
    }
    container.appendChild(text);
    container.appendChild(createTextContent("Contract Identifier", identifier));
    return container;
}

const ACTION_DISPATCH = {
    createAccount: {
        label: "CreateAccount",
        warn: false,
        render: function () {
            return createAccountContent();
        },
    },
    deployContract: {
        label: "DeployContract",
        warn: true,
        render: function (a) {
            return deployContractContent(a);
        },
    },
    functionCall: {
        label: "FunctionCall",
        warn: false,
        render: function (a, opts) {
            return functionCallContent(a, opts);
        },
    },
    transfer: {
        label: "Transfer",
        warn: false,
        render: function (a, opts) {
            return transferContent(a, opts);
        },
    },
    stake: {
        label: "Stake",
        warn: false,
        render: function (a, opts) {
            return stakeContent(a, opts);
        },
    },
    addKey: {
        label: "AddKey",
        warn: false,
        render: function (a) {
            return addKeyContent(a);
        },
        warnsWhen: function (a) {
            return !!(
                a.addKey &&
                a.addKey.accessKey &&
                a.addKey.accessKey.permission &&
                a.addKey.accessKey.permission.fullAccess !== undefined
            );
        },
    },
    deleteKey: {
        label: "DeleteKey",
        warn: true,
        render: function (a) {
            return deleteKeyContent(a);
        },
    },
    deleteAccount: {
        label: "DeleteAccount",
        warn: true,
        render: function (a) {
            return deleteAccountContent(a);
        },
    },
    signedDelegate: {
        label: "SignedDelegate",
        warn: false,
        render: function (a) {
            return signedDelegateContent(a);
        },
    },
    deployGlobalContract: {
        label: "DeployGlobalContract",
        warn: true,
        render: function (a) {
            return deployGlobalContractContent(a);
        },
    },
    useGlobalContract: {
        label: "UseGlobalContract",
        warn: false,
        render: function (a) {
            return useGlobalContractContent(a);
        },
    },
};

function handleNearAction(action, options) {
    const actionKey = getActionType(action);
    const entry = actionKey ? ACTION_DISPATCH[actionKey] : null;
    if (!entry) {
        const unknown = document.createElement("div");
        unknown.textContent = `Unknown action: ${actionKey || "(empty)"}`;
        return createAccordion("Unknown", unknown, true);
    }
    const showWarning = entry.warnsWhen ? entry.warnsWhen(action) : !!entry.warn;
    return createAccordion(entry.label, entry.render(action, options), showWarning);
}

/**
 * Build the full details DOM tree for a form custom field.
 *
 * @param {object} params
 * @param {Array<{label: string, value: string|undefined}>} params.fields - top-level fields like Signer/Receiver/MaxBlockHeight.
 * @param {string} params.actions - JSON string with the actions array (as Auth0 form fields deliver them).
 * @param {{ showYoctoConversion?: boolean }} [params.options]
 */
function renderDetails(params) {
    ensureBufferPolyfill();
    const box = document.createElement("div");
    box.classList.add("box");

    for (const field of params.fields || []) {
        if (field.value === undefined || field.value === null || field.value === "") continue;
        box.appendChild(createTextContent(field.label, field.value));
    }

    const actionsContainer = document.createElement("div");
    actionsContainer.classList.add("actions-container");
    const actionsLabel = document.createElement("div");
    actionsLabel.classList.add("label");
    actionsLabel.textContent = "Actions";
    actionsContainer.appendChild(actionsLabel);

    let parsedActions = [];
    try {
        parsedActions = JSON.parse(params.actions || "[]");
    } catch (e) {
        const errorNode = document.createElement("div");
        errorNode.classList.add("warning-callout");
        errorNode.textContent = "Failed to parse actions payload.";
        actionsContainer.appendChild(errorNode);
        box.appendChild(actionsContainer);
        return box;
    }

    for (const action of parsedActions) {
        actionsContainer.appendChild(handleNearAction(action, params.options));
    }

    box.appendChild(actionsContainer);
    return box;
}

var __auth0FormHelpers = {
    ensureBufferPolyfill: ensureBufferPolyfill,
    base58Encode: base58Encode,
    yoctoToNear: yoctoToNear,
    formatNearAmount: formatNearAmount,
    decodeFunctionCallArgs: decodeFunctionCallArgs,
    formatPublicKey: formatPublicKey,
    getActionType: getActionType,
    createTextContent: createTextContent,
    createDescription: createDescription,
    createAccordion: createAccordion,
    createAccountContent: createAccountContent,
    deployContractContent: deployContractContent,
    functionCallContent: functionCallContent,
    transferContent: transferContent,
    stakeContent: stakeContent,
    addKeyContent: addKeyContent,
    deleteKeyContent: deleteKeyContent,
    deleteAccountContent: deleteAccountContent,
    signedDelegateContent: signedDelegateContent,
    deployGlobalContractContent: deployGlobalContractContent,
    useGlobalContractContent: useGlobalContractContent,
    handleNearAction: handleNearAction,
    renderDetails: renderDetails,
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = __auth0FormHelpers;
}
