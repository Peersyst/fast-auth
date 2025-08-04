/**
 * This custom field uses imask.js to mask an input with a currency symbol
 * Add "symbol" param using a value like "€" to see the difference
 */
function AuthorizeAppImage(context) {
    /** getParams() method returns the params you've configured in your input */

    return {
        /** Invoked once when the field is created */
        init() {
            const layout = document.createElement("div");
            layout.classList.add("layout");

            const leftAvatar = document.createElement("img");
            leftAvatar.classList.add("avatar");

            const rightAvatar = document.createElement("img");
            rightAvatar.classList.add("avatar");

            const circle = document.createElement("div");
            circle.classList.add("circle");

            const icon = document.createElement("img");
            icon.classList.add("icon");

            const config = context.custom.getParams();
            const { imageUrl } = config;

            console.log("config", config);

            icon.setAttribute(
                "src",
                "https://peersyst-public-production.s3.eu-west-1.amazonaws.com/1b54f479-7990-4834-9b37-95b26e2023fb.png",
            );
            leftAvatar.setAttribute(
                "src",
                "https://peersyst-public-production.s3.eu-west-1.amazonaws.com/db9f38ff-53ea-4f76-a1c0-33c728386e5b.png",
            );
            rightAvatar.setAttribute("src", imageUrl);

            circle.appendChild(icon);
            layout.appendChild(leftAvatar);
            leftAvatar.after(circle);
            circle.after(rightAvatar);

            return layout;
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
