/**
 * This custom field uses imask.js to mask an input with a currency symbol
 * Add "symbol" param using a value like "€" to see the difference
 */
function CustomCurrencyField(context) {
    const DEFAULT_CURRENCY_SYMBOL = "$";

    const input = document.createElement("input");
    input.classList.add("af-stringField-input");

    let mask = null;

    function mountComponent() {
        /** getParams() method returns the params you've configured in your input */
        const config = context.custom.getParams();
        const { symbol } = config;
        const currencySymbol = symbol || DEFAULT_CURRENCY_SYMBOL;

        mask = IMask(input, {
            mask: `${currencySymbol}num`,
            blocks: {
                num: {
                    mask: Number,
                    thousandsSeparator: ",",
                },
            },
        });
    }

    return {
        /** Invoked once when the field is created */
        init() {
            mountComponent();
            return input;
        },

        /** Returns a list of URLs that the SDK guarantees that will loaded before init() is invoked */
        getScripts() {
            return ["https://unpkg.com/imask"];
        },

        /** Invoked when field has to be blocked */
        block() {
            input.disabled = true;
        },

        /** Invoked when field has to be unblocked */
        unblock() {
            input.disabled = false;
        },

        /** Invoked when the SDK needs to get the value (possibly several times) */
        getValue() {
            return {
                value: mask.value,
                unmaskedValue: mask.unmaskedValue,
            };
        },
    };
}
