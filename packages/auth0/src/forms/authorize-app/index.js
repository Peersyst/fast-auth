/**
 * This custom field uses imask.js to mask an input with a currency symbol
 * Add "symbol" param using a value like "€" to see the difference
 */
function AuthorizeAppImage(context) {
    const main = document.createElement("div").classList.add("main");

    const layout = document.createElement("div").classList.add("layout");
    const leftAvatar = document.createElement("img").classList.add("avatar");
    const rightAvatar = document.createElement("img").classList.add("avatar");

    const circle = document.createElement("div").classList.add("circle");
    const icon = document.createElement("img").classList.add("icon");

    function mountComponent() {
        /** getParams() method returns the params you've configured in your input */
        const config = context.custom.getParams();
        const { appImageUrl, leftImageUrl, iconUrl } = config;

        icon.src = iconUrl;
        leftAvatar.src = leftImageUrl;
        rightAvatar.src = appImageUrl;

        circle.appendChild(icon);
        layout.appendChild(leftAvatar).appendChild(circle).appendChild(rightAvatar);

        main.appendChild(layout);
    }

    return {
        /** Invoked once when the field is created */
        init() {
            mountComponent();
            return main;
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
