/**
 * Custom field that renders the testing-environment warning. It is injected as the first
 * block of every step by the `*_form.testing.json` build variant and never appears in the
 * production forms. The text takes no params so the testing forms cannot drift from each other.
 */
function AuthorizeAppTestingBanner(context) {
    return {
        init() {
            const banner = document.createElement("div");
            banner.classList.add("testing-banner");
            banner.setAttribute("role", "note");
            banner.textContent = "This is a testing environment. No security guarantees are made. Do not use it for real funds.";
            return banner;
        },

        getScripts() {
            return [];
        },

        block() {},

        unblock() {},

        getValue() {},
    };
}
