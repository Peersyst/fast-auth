/**
 * Custom field that renders the Approve / Deny buttons for the authorize flow.
 *
 * Auth0 Forms buttons can only navigate — they cannot record a choice. So instead of the
 * native NEXT_BUTTON / PREVIOUS_BUTTON, this field owns both buttons and writes the user's
 * choice into the `decision` hidden field before advancing. The resuming action reads
 * `event.prompt.fields.decision` in onContinuePostLogin and denies access when it is "denied".
 *
 * Params (configured per-form in <form>_form_base.json):
 *   - approveText: label for the approve button (default "Approve")
 *   - denyText: label for the deny button (default "Deny")
 */
function AuthorizeAppDecision(context) {
    return {
        init: function () {
            const params = context.custom.getParams();

            const layout = document.createElement("div");
            layout.classList.add("decision-layout");

            const approve = document.createElement("button");
            approve.setAttribute("type", "button");
            approve.classList.add("decision-button", "approve");
            approve.textContent = params.approveText || "Approve";
            approve.addEventListener("click", function () {
                context.form.setHiddenField("decision", "approved");
                context.form.goForward();
            });

            const deny = document.createElement("button");
            deny.setAttribute("type", "button");
            deny.classList.add("decision-button", "deny");
            deny.textContent = params.denyText || "Deny";
            deny.addEventListener("click", function () {
                context.form.setHiddenField("decision", "denied");
                context.form.goForward();
            });

            layout.appendChild(approve);
            layout.appendChild(deny);
            return layout;
        },
        getScripts: function () { return []; },
        block: function () {},
        unblock: function () {},
        getValue: function () {},
    };
}
