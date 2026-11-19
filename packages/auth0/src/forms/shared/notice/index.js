/**
 * Custom field that renders an environment notice above the consent screen, such as the
 * sandbox warning.
 *
 * Params (configured per-form in <form>_form_base.json):
 *   - text: the notice, i.e. {{ fields.notice }}. The action leaves it empty outside the
 *     sandbox, and an empty notice renders nothing, so the same forms serve every tenant.
 */
function AuthorizeAppNotice(context) {
    return {
        init: function () {
            const notice = document.createElement("div");
            const text = (context.custom.getParams().text || "").trim();
            if (text) {
                notice.classList.add("environment-notice");
                notice.setAttribute("role", "note");
                notice.textContent = text;
            }
            return notice;
        },
        getScripts: function () {
            return [];
        },
        block: function () {},
        unblock: function () {},
        getValue: function () {},
    };
}
