/**
 * Playground orchestrator. Renders one card per (mode × action type), calling the real
 * production factory (AuthorizeAppTransactionDetails / AuthorizeAppDelegateActionDetails)
 * with a mock Auth0 form context.
 */
(function () {
    "use strict";

    const root = document.getElementById("cards");
    const fuzzToggle = document.getElementById("fuzz-toggle");
    const refreshBtn = document.getElementById("refresh");
    const modeFilter = document.getElementById("mode-filter");

    const FORMS = [
        {
            mode: "transaction",
            label: "Transaction",
            factory: window.AuthorizeAppTransactionDetails,
            buildPayload: window.PlaygroundPayloads.buildTransactionPayload,
            actionNames: window.PlaygroundPayloads.ACTION_NAMES,
        },
        {
            mode: "delegate_action",
            label: "DelegateAction",
            factory: window.AuthorizeAppDelegateActionDetails,
            buildPayload: window.PlaygroundPayloads.buildDelegateActionPayload,
            actionNames: window.PlaygroundPayloads.DELEGATE_ACTION_NAMES,
        },
    ];

    function makeCard(form, actionName, fuzzMode) {
        const card = document.createElement("div");
        card.className = "card";

        const header = document.createElement("div");
        header.className = "card-header";
        const title = document.createElement("h3");
        title.textContent = `${form.label} · ${actionName}`;
        const badge = document.createElement("span");
        badge.className = "badge " + (fuzzMode === "fuzz" ? "fuzz" : "preset");
        badge.textContent = fuzzMode;
        header.appendChild(title);
        header.appendChild(badge);

        const body = document.createElement("div");
        body.className = "card-body";

        let payload;
        let rendered;
        try {
            payload = form.buildPayload(actionName, fuzzMode);
            const context = window.createMockContext(payload.params);
            const component = form.factory(context);
            rendered = component.init();
        } catch (err) {
            const errBox = document.createElement("pre");
            errBox.className = "error";
            errBox.textContent = String(err && err.stack ? err.stack : err);
            body.appendChild(errBox);
        }
        if (rendered) body.appendChild(rendered);

        // Mount the Approve/Deny decision component below the details, exactly like the form.
        const decisionStatus = document.createElement("p");
        decisionStatus.className = "decision-status";
        try {
            const decisionContext = window.createMockContext({ approveText: "Approve", denyText: "Deny" }, function (event, data) {
                if (event === "goForward") {
                    decisionStatus.textContent = "decision → " + (data.hidden.decision || "(unset)");
                }
            });
            const decisionComponent = window.AuthorizeAppDecision(decisionContext);
            body.appendChild(decisionComponent.init());
            body.appendChild(decisionStatus);
        } catch (err) {
            const errBox = document.createElement("pre");
            errBox.className = "error";
            errBox.textContent = String(err && err.stack ? err.stack : err);
            body.appendChild(errBox);
        }

        const debugDetails = document.createElement("details");
        debugDetails.className = "debug";
        const debugSummary = document.createElement("summary");
        debugSummary.textContent = "params";
        const debugPre = document.createElement("pre");
        debugPre.textContent = JSON.stringify(payload && payload.params, null, 2);
        debugDetails.appendChild(debugSummary);
        debugDetails.appendChild(debugPre);

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(debugDetails);
        return card;
    }

    function render() {
        const fuzzMode = fuzzToggle.checked ? "fuzz" : "preset";
        const filter = modeFilter.value;
        root.innerHTML = "";
        for (const form of FORMS) {
            if (filter !== "all" && filter !== form.mode) continue;
            for (const actionName of form.actionNames) {
                root.appendChild(makeCard(form, actionName, fuzzMode));
            }
        }
    }

    refreshBtn.addEventListener("click", render);
    fuzzToggle.addEventListener("change", render);
    modeFilter.addEventListener("change", render);
    render();
})();
