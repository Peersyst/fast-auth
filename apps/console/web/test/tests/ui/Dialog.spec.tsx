import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConfirmDialog, Dialog } from "../../../src/ui/Dialog";

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
    it("should open named by its title", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.click(screen.getByRole("button", { name: "Open" }));

        expect(screen.getByRole("dialog", { name: "Edit dApp" })).toBeInTheDocument();
    });

    it("should announce its description", () => {
        render(
            <Dialog open onClose={jest.fn()} title="Approve Acme?" description="This creates its Auth0 application." icon={<svg />}>
                <button>OK</button>
            </Dialog>,
        );

        expect(screen.getByRole("dialog", { name: "Approve Acme?" })).toHaveAccessibleDescription("This creates its Auth0 application.");
    });

    it("should close on Escape and give focus back", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole("button", { name: "Open" }));

        await user.keyboard("{Escape}");

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    });
});

describe("ConfirmDialog", () => {
    it("should confirm only after the confirmation string is typed", async () => {
        const user = userEvent.setup();
        const onConfirm = jest.fn();
        render(
            <ConfirmDialog
                open
                onClose={jest.fn()}
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
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledWith();
    });

    it.each([
        ["a double space", "Acme  App", "Acme App"],
        ["a no-break space", "Acme\u00a0App", "Acme App"],
        ["a decomposed accent", "Cafe\u0301", "Caf\u00e9"],
    ])("should accept the name as displayed when it has %s", async (_, name, typed) => {
        const user = userEvent.setup();
        const onConfirm = jest.fn();
        render(<ConfirmDialog open onClose={jest.fn()} title="Remove?" confirmLabel="Remove" confirmText={name} onConfirm={onConfirm} />);

        await user.type(screen.getByRole("textbox"), typed);
        await user.click(screen.getByRole("button", { name: "Remove" }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledWith();
    });

    it("should require a reason of the minimum length and pass it trimmed", async () => {
        const user = userEvent.setup();
        const onConfirm = jest.fn();
        render(
            <ConfirmDialog
                open
                onClose={jest.fn()}
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

    it("should cap a reason at its maximum length and say so", async () => {
        const user = userEvent.setup();
        const onConfirm = jest.fn();
        render(
            <ConfirmDialog
                open
                onClose={jest.fn()}
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

    it("should cancel through onClose", async () => {
        const user = userEvent.setup();
        const onClose = jest.fn();
        render(<ConfirmDialog open onClose={onClose} title="Approve Acme?" confirmLabel="Approve" onConfirm={jest.fn()} />);

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should close through onClose when the browser asks to cancel it", () => {
        const onClose = jest.fn();
        render(<ConfirmDialog open onClose={onClose} title="Approve Acme?" confirmLabel="Approve" onConfirm={jest.fn()} />);

        screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should ignore Escape, Cancel and the browser's cancel while the action is in flight", async () => {
        const user = userEvent.setup();
        const onClose = jest.fn();
        render(<ConfirmDialog open onClose={onClose} title="Approve Acme?" confirmLabel="Approve" loading onConfirm={jest.fn()} />);

        await user.keyboard("{Escape}");
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));

        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("should stay open when the browser closes it while the action is in flight", () => {
        render(<ConfirmDialog open onClose={jest.fn()} title="Approve Acme?" confirmLabel="Approve" loading onConfirm={jest.fn()} />);
        const dialog = screen.getByRole("dialog", { name: "Approve Acme?" });

        dialog.dispatchEvent(new Event("cancel"));
        dialog.removeAttribute("open");
        dialog.dispatchEvent(new Event("close"));

        expect(screen.getByRole("dialog", { name: "Approve Acme?" })).toBeVisible();
    });
});
