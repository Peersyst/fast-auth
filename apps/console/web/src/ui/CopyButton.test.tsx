import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./CopyButton";

describe("CopyButton", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("copies the value and names the button Copied", async () => {
        const user = userEvent.setup();
        render(<CopyButton value="client-abc" label="Copy client ID" />);
        const writeText = vi.spyOn(navigator.clipboard, "writeText");

        await user.click(screen.getByRole("button", { name: "Copy client ID" }));

        expect(writeText).toHaveBeenCalledExactlyOnceWith("client-abc");
        expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    });

    it("goes back to its label after two seconds", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<CopyButton value="client-abc" label="Copy client ID" />);

        await user.click(screen.getByRole("button", { name: "Copy client ID" }));
        await screen.findByRole("button", { name: "Copied" });
        await vi.advanceTimersByTimeAsync(2000);

        expect(screen.getByRole("button", { name: "Copy client ID" })).toBeInTheDocument();
    });

    it("says Copy failed when the clipboard refuses", async () => {
        const user = userEvent.setup();
        render(<CopyButton value="client-abc" label="Copy client ID" />);
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new DOMException("denied", "NotAllowedError"));

        await user.click(screen.getByRole("button", { name: "Copy client ID" }));

        expect(await screen.findByRole("button", { name: "Copy failed" })).toHaveTextContent("Copy failed");
    });

    it("leaves no timer behind when it unmounts while showing Copied", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const { unmount } = render(<CopyButton value="client-abc" label="Copy client ID" />);
        await user.click(screen.getByRole("button", { name: "Copy client ID" }));
        await screen.findByRole("button", { name: "Copied" });

        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
