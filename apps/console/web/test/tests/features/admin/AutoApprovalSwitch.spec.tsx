import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiError, mockApi, refocus, renderApp, type MockRoutes } from "../../../utils/api";
import { AutoApprovalSwitch } from "../../../../src/features/admin/AutoApprovalSwitch";

const SETTINGS = "/api/console/admin/settings";

async function renderSwitch(enabled: boolean, routes: MockRoutes = {}) {
    let saved = enabled;
    const api = mockApi({
        [`GET ${SETTINGS}`]: () => ({ body: { autoApproval: { enabled: saved, dailyCap: 10 } } }),
        [`PUT ${SETTINGS}`]: (request) => {
            saved = (request.body as { autoApproval: { enabled: boolean } }).autoApproval.enabled;
            return { body: { autoApproval: { enabled: saved, dailyCap: 10 } } };
        },
        ...routes,
    });
    renderApp([{ path: "/", element: <AutoApprovalSwitch /> }], "/");
    const toggle = await screen.findByRole("switch", { name: "Auto-approve new submissions" });
    return { api, toggle };
}

describe("AutoApprovalSwitch", () => {
    it("should turn off at once, without asking", async () => {
        const user = userEvent.setup();
        const { api, toggle } = await renderSwitch(true);
        expect(toggle).toBeChecked();

        await user.click(toggle);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(api.sent(`PUT ${SETTINGS}`)[0]?.body).toEqual({ autoApproval: { enabled: false } });
        await waitFor(() => expect(toggle).not.toBeChecked());
    });

    it("should ask before turning on", async () => {
        const user = userEvent.setup();
        const { api, toggle } = await renderSwitch(false);
        expect(toggle).not.toBeChecked();

        await user.click(toggle);
        const dialog = screen.getByRole("dialog", { name: "Turn on auto-approval?" });
        expect(dialog).toHaveTextContent("up to 10 every 24 hours");
        expect(api.sent(`PUT ${SETTINGS}`)).toHaveLength(0);
        await user.click(within(dialog).getByRole("button", { name: "Turn on auto-approval" }));

        expect(api.sent(`PUT ${SETTINGS}`)[0]?.body).toEqual({ autoApproval: { enabled: true } });
        await waitFor(() => expect(toggle).toBeChecked());
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should show the saved value from the save's answer, without loading the setting again", async () => {
        const user = userEvent.setup();
        let loads = 0;
        const { toggle } = await renderSwitch(true, {
            [`GET ${SETTINGS}`]: () =>
                loads++ === 0 ? { body: { autoApproval: { enabled: true, dailyCap: 10 } } } : new Promise(() => {}),
        });

        await user.click(toggle);

        await waitFor(() => expect(toggle).not.toBeChecked());
        expect(loads).toBe(1);
        expect(toggle).toBeEnabled();
    });

    it("should keep keyboard focus on the switch and ignore another toggle while saving", async () => {
        const user = userEvent.setup();
        const { api, toggle } = await renderSwitch(true, { [`PUT ${SETTINGS}`]: () => new Promise(() => {}) });

        toggle.focus();
        await user.keyboard(" ");
        await waitFor(() => expect(api.sent(`PUT ${SETTINGS}`)).toHaveLength(1));
        await user.keyboard(" ");

        expect(toggle).toBeEnabled();
        expect(toggle).toHaveAttribute("aria-disabled", "true");
        expect(toggle).toHaveFocus();
        expect(toggle).toBeChecked();
        expect(api.sent(`PUT ${SETTINGS}`).map((request) => request.body)).toEqual([{ autoApproval: { enabled: false } }]);
    });

    it("should keep the switch on and say so when turning off fails", async () => {
        const user = userEvent.setup();
        const { toggle } = await renderSwitch(true, { [`PUT ${SETTINGS}`]: apiError(429, "RATE_LIMITED") });

        await user.click(toggle);

        expect(await screen.findByRole("alert")).toHaveTextContent("Not changedToo many changes in a short time.");
        await waitFor(() => expect(toggle).toBeEnabled());
        expect(toggle).toBeChecked();
    });

    it("should show a failed turn-on in the dialog and leave the switch off", async () => {
        const user = userEvent.setup();
        const { toggle } = await renderSwitch(false, { [`PUT ${SETTINGS}`]: apiError(500, "INTERNAL") });

        await user.click(toggle);
        const dialog = screen.getByRole("dialog", { name: "Turn on auto-approval?" });
        await user.click(within(dialog).getByRole("button", { name: "Turn on auto-approval" }));

        expect(await within(dialog).findByRole("alert")).toHaveTextContent("Something went wrong on our side.");
        expect(toggle).not.toBeChecked();
    });

    it("should keep the loaded setting and warn that it may be out of date when a refresh fails", async () => {
        let loads = 0;
        const { toggle } = await renderSwitch(true, {
            [`GET ${SETTINGS}`]: () =>
                loads++ === 0 ? { body: { autoApproval: { enabled: true, dailyCap: 10 } } } : apiError(429, "RATE_LIMITED"),
        });

        refocus();

        expect(await screen.findByText("Could not refresh, so this may be out of date")).toBeInTheDocument();
        expect(screen.queryByText("The setting could not be loaded")).not.toBeInTheDocument();
        expect(toggle).toBeChecked();
        expect(toggle).toBeEnabled();
    });

    it("should say when the setting could not be loaded without claiming On or Off, and load it on Try again", async () => {
        const user = userEvent.setup();
        let fail = true;
        mockApi({
            [`GET ${SETTINGS}`]: () => (fail ? apiError(429, "RATE_LIMITED") : { body: { autoApproval: { enabled: true, dailyCap: 10 } } }),
        });
        renderApp([{ path: "/", element: <AutoApprovalSwitch /> }], "/");

        expect(await screen.findByRole("alert")).toHaveTextContent("The setting could not be loadedToo many changes in a short time.");
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
        expect(screen.queryByText("Off")).not.toBeInTheDocument();
        fail = false;
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByRole("switch", { name: "Auto-approve new submissions" })).toBeChecked();
        expect(screen.getByText("On")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
