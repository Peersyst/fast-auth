import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Dialog, DialogForm } from "../../../../../src/components/feedback/dialog";

function Harness(): React.JSX.Element {
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

function FormDialog({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: () => void; loading?: boolean }): React.JSX.Element {
    return (
        <Dialog open onClose={onClose} title="Approve Acme?" busy={loading}>
            <DialogForm onSubmit={onSubmit} onClose={onClose} confirmLabel="Approve" cancelLabel="Cancel" loading={loading}>
                <p>Acme gets its Auth0 application.</p>
            </DialogForm>
        </Dialog>
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

    it("should close through onClose when the browser asks to cancel it", () => {
        const onClose = jest.fn();
        render(<FormDialog onClose={onClose} onSubmit={jest.fn()} />);

        screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should stay open when the browser closes it while the action is in flight", () => {
        render(<FormDialog onClose={jest.fn()} onSubmit={jest.fn()} loading />);
        const dialog = screen.getByRole("dialog", { name: "Approve Acme?" });

        dialog.dispatchEvent(new Event("cancel"));
        dialog.removeAttribute("open");
        dialog.dispatchEvent(new Event("close"));

        expect(screen.getByRole("dialog", { name: "Approve Acme?" })).toBeVisible();
    });
});

describe("DialogForm", () => {
    it("should submit through onSubmit", async () => {
        const user = userEvent.setup();
        const onSubmit = jest.fn();
        render(<FormDialog onClose={jest.fn()} onSubmit={onSubmit} />);

        await user.click(screen.getByRole("button", { name: "Approve" }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("should cancel through onClose", async () => {
        const user = userEvent.setup();
        const onClose = jest.fn();
        render(<FormDialog onClose={onClose} onSubmit={jest.fn()} />);

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should ignore Escape, Cancel and the browser's cancel while the action is in flight", async () => {
        const user = userEvent.setup();
        const onClose = jest.fn();
        render(<FormDialog onClose={onClose} onSubmit={jest.fn()} loading />);

        await user.keyboard("{Escape}");
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));

        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(onClose).not.toHaveBeenCalled();
    });
});
