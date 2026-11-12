import userEvent from "@testing-library/user-event";
import { AutoApprovalSwitch } from "../../../../../../src/modules/admin/containers/auto-approval-switch/auto-approval-switch";
import { apiError, mockApi, MockRoutes, refocus, renderRoutes, screen, waitFor, within } from "../../../../../utils";

const SETTINGS = "/api/console/admin/settings";

/**
 * Renders the switch with the console holding the setting, which a save changes.
 * @param enabled Whether auto-approval starts on.
 * @param routes Answers that replace the default ones.
 * @returns The requests sent and the switch.
 */
async function renderSwitch(enabled: boolean, routes: MockRoutes = {}): Promise<{ api: ReturnType<typeof mockApi>; toggle: HTMLElement }> {
    let saved = enabled;
    const api = mockApi({
        [`GET ${SETTINGS}`]: () => ({ body: { autoApproval: { enabled: saved } } }),
        [`PUT ${SETTINGS}`]: (request) => {
            saved = (request.body as { autoApproval: { enabled: boolean } }).autoApproval.enabled;
            return { body: { autoApproval: { enabled: saved } } };
        },
        ...routes,
    });
    renderRoutes([{ path: "/", element: <AutoApprovalSwitch /> }], "/");
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
        expect(dialog).toHaveTextContent("with nobody reviewing it");
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
            [`GET ${SETTINGS}`]: () => (loads++ === 0 ? { body: { autoApproval: { enabled: true } } } : new Promise(() => {})),
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
        const { toggle } = await renderSwitch(true, { [`PUT ${SETTINGS}`]: apiError(500, "Internal server error") });

        await user.click(toggle);

        expect(await screen.findByRole("alert")).toHaveTextContent("Not changedSomething went wrong on our side.");
        await waitFor(() => expect(toggle).toBeEnabled());
        expect(toggle).toBeChecked();
    });

    it("should show a failed turn-on in the dialog and leave the switch off", async () => {
        const user = userEvent.setup();
        const { toggle } = await renderSwitch(false, { [`PUT ${SETTINGS}`]: apiError(500, "Internal server error") });

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
                loads++ === 0 ? { body: { autoApproval: { enabled: true } } } : apiError(500, "Internal server error"),
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
            [`GET ${SETTINGS}`]: () => (fail ? apiError(500, "Internal server error") : { body: { autoApproval: { enabled: true } } }),
        });
        renderRoutes([{ path: "/", element: <AutoApprovalSwitch /> }], "/");

        expect(await screen.findByRole("alert")).toHaveTextContent("The setting could not be loadedSomething went wrong on our side.");
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
        expect(screen.queryByText("Off")).not.toBeInTheDocument();
        fail = false;
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByRole("switch", { name: "Auto-approve new submissions" })).toBeChecked();
        expect(screen.getByText("On")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
