import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "../../../src/ui/CopyButton";

describe("CopyButton", () => {
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("should copy the value and name the button Copied", async () => {
        const user = userEvent.setup();
        render(<CopyButton value="client-abc" label="Copy client ID" />);
        const writeText = jest.spyOn(navigator.clipboard, "writeText");

        await user.click(screen.getByRole("button", { name: "Copy client ID" }));

        expect(writeText).toHaveBeenCalledTimes(1);
        expect(writeText).toHaveBeenCalledWith("client-abc");
        expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    });

    it("should go back to its label after two seconds", async () => {
        jest.useFakeTimers({ advanceTimers: true });
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        render(<CopyButton value="client-abc" label="Copy client ID" />);

        await user.click(screen.getByRole("button", { name: "Copy client ID" }));
        await screen.findByRole("button", { name: "Copied" });
        await jest.advanceTimersByTimeAsync(2000);

        expect(screen.getByRole("button", { name: "Copy client ID" })).toBeInTheDocument();
    });

    it("should say Copy failed when the clipboard refuses", async () => {
        const user = userEvent.setup();
        render(<CopyButton value="client-abc" label="Copy client ID" />);
        jest.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new DOMException("denied", "NotAllowedError"));

        await user.click(screen.getByRole("button", { name: "Copy client ID" }));

        expect(await screen.findByRole("button", { name: "Copy failed" })).toHaveTextContent("Copy failed");
    });

    it("should leave no timer behind when it unmounts while showing Copied", async () => {
        jest.useFakeTimers({ advanceTimers: true });
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        const { unmount } = render(<CopyButton value="client-abc" label="Copy client ID" />);
        await user.click(screen.getByRole("button", { name: "Copy client ID" }));
        await screen.findByRole("button", { name: "Copied" });

        unmount();

        expect(jest.getTimerCount()).toBe(0);
    });
});
