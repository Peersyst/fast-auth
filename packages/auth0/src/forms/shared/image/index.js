/**
 * Custom field that renders two app avatars (left = our wallet, right = requesting app)
 * separated by a small circle with a transfer/icon glyph in the middle.
 *
 * Params (configured per-form in <form>_form_base.json):
 *   - leftImageUrl: URL for the left avatar (our wallet/identity logo)
 *   - rightImageUrl: URL for the right avatar (the requesting app's logo, e.g. {{ fields.imageUrl }})
 *   - iconUrl: URL for the center circle icon
 *
 * If `rightImageUrl` is empty/missing (e.g. the client has no logo_uri configured), the
 * right avatar is hidden so we don't render a broken-image placeholder.
 */
function AuthorizeAppImage(context) {
    return {
        /** Invoked once when the field is created */
        init() {
            const layout = document.createElement("div");
            layout.classList.add("layout");

            const { leftImageUrl, rightImageUrl, iconUrl } = context.custom.getParams();

            const leftAvatar = document.createElement("img");
            leftAvatar.classList.add("avatar");
            leftAvatar.setAttribute("alt", "");
            leftAvatar.setAttribute("src", leftImageUrl);

            layout.appendChild(leftAvatar);

            const trimmedRight = (rightImageUrl || "").trim();
            if (trimmedRight) {
                const circle = document.createElement("div");
                circle.classList.add("circle");

                const icon = document.createElement("img");
                icon.classList.add("icon");
                icon.setAttribute("alt", "");
                icon.setAttribute("src", iconUrl);
                circle.appendChild(icon);

                const rightAvatar = document.createElement("img");
                rightAvatar.classList.add("avatar");
                rightAvatar.setAttribute("alt", "");
                rightAvatar.setAttribute("src", trimmedRight);

                layout.appendChild(circle);
                layout.appendChild(rightAvatar);
            }

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
