import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, Dialog } from "./Dialog";

function Harness() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)}>Open</button>
            <Dialog open={open} onClose={() => setOpen(false)} title="Edit dApp">
                <button>Save</button>
            </Dialog>
        </>
    );
}

describe("Dialog", () => {
    it("opens named by its title", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.click(screen.getByRole("button", { name: "Open" }));

        expect(screen.getByRole("dialog", { name: "Edit dApp" })).toBeInTheDocument();
    });

    it("announces its description", () => {
        render(
            <Dialog open onClose={vi.fn()} title="Approve Acme?" description="This creates its Auth0 application." icon={<svg />}>
                <button>OK</button>
            </Dialog>,
        );

        expect(screen.getByRole("dialog", { name: "Approve Acme?" })).toHaveAccessibleDescription("This creates its Auth0 application.");
    });

    it("closes on Escape and gives focus back", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole("button", { name: "Open" }));

        await user.keyboard("{Escape}");

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    });
});

describe("ConfirmDialog", () => {
    it("confirms only after the confirmation string is typed", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(
            <ConfirmDialog
                open
                onClose={vi.fn()}
                title="Remove Acme?"
                confirmLabel="Remove"
                destructive
                confirmText="Acme"
                onConfirm={onConfirm}
            />,
        );
        const confirm = screen.getByRole("button", { name: "Remove" });

        await user.type(screen.getByLabelText("Type Acme to confirm"), "Acm{Enter}");
        expect(confirm).toBeDisabled();
        await user.click(confirm);
        expect(onConfirm).not.toHaveBeenCalled();

        await user.type(screen.getByLabelText("Type Acme to confirm"), "e");
        await user.click(confirm);
        expect(onConfirm).toHaveBeenCalledExactlyOnceWith();
    });

    it.each([
        ["a double space", "Acme  App", "Acme App"],
        ["a no-break space", "Acme\u00a0App", "Acme App"],
        ["a decomposed accent", "Cafe\u0301", "Caf\u00e9"],
    ])("accepts the name as displayed when it has %s", async (_, name, typed) => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<ConfirmDialog open onClose={vi.fn()} title="Remove?" confirmLabel="Remove" confirmText={name} onConfirm={onConfirm} />);

        await user.type(screen.getByRole("textbox"), typed);
        await user.click(screen.getByRole("button", { name: "Remove" }));

        expect(onConfirm).toHaveBeenCalledExactlyOnceWith();
    });

    it("requires a reason of the minimum length and passes it trimmed", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(
            <ConfirmDialog
                open
                onClose={vi.fn()}
                title="Reject Acme?"
                confirmLabel="Reject"
                reason={{ label: "Reason", minLength: 10, maxLength: 40 }}
                onConfirm={onConfirm}
            />,
        );
        const reason = screen.getByLabelText("Reason");
        const confirm = screen.getByRole("button", { name: "Reject" });
        expect(reason).toHaveAccessibleDescription("Between 10 and 40 characters.");

        await user.type(reason, "  too short   ");
        expect(confirm).toBeDisabled();

        await user.clear(reason);
        await user.type(reason, "  Callback URL is not HTTPS  ");
        await user.click(confirm);
        expect(onConfirm).toHaveBeenCalledWith("Callback URL is not HTTPS");
    });

    it("caps a reason at its maximum length and says so", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(
            <ConfirmDialog
                open
                onClose={vi.fn()}
                title="Reject Acme?"
                confirmLabel="Reject"
                reason={{ label: "Reason", minLength: 10, maxLength: 40 }}
                onConfirm={onConfirm}
            />,
        );
        const reason = screen.getByLabelText("Reason");

        await user.type(reason, "x".repeat(50));
        await user.click(screen.getByRole("button", { name: "Reject" }));

        expect(reason).toHaveValue("x".repeat(40));
        expect(reason).toHaveAccessibleDescription("Between 10 and 40 characters. You've reached the limit.");
        expect(onConfirm).toHaveBeenCalledWith("x".repeat(40));
    });

    it("cancels through onClose", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<ConfirmDialog open onClose={onClose} title="Approve Acme?" confirmLabel="Approve" onConfirm={vi.fn()} />);

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onClose).toHaveBeenCalledOnce();
    });

    it("closes through onClose when the browser asks to cancel it", () => {
        const onClose = vi.fn();
        render(<ConfirmDialog open onClose={onClose} title="Approve Acme?" confirmLabel="Approve" onConfirm={vi.fn()} />);

        screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));

        expect(onClose).toHaveBeenCalledOnce();
    });

    it("ignores Escape, Cancel and the browser's cancel while the action is in flight", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<ConfirmDialog open onClose={onClose} title="Approve Acme?" confirmLabel="Approve" loading onConfirm={vi.fn()} />);

        await user.keyboard("{Escape}");
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));

        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("stays open when the browser closes it while the action is in flight", () => {
        render(<ConfirmDialog open onClose={vi.fn()} title="Approve Acme?" confirmLabel="Approve" loading onConfirm={vi.fn()} />);
        const dialog = screen.getByRole("dialog", { name: "Approve Acme?" });

        dialog.dispatchEvent(new Event("cancel"));
        dialog.removeAttribute("open");
        dialog.dispatchEvent(new Event("close"));

        expect(screen.getByRole("dialog", { name: "Approve Acme?" })).toBeVisible();
    });
});
