import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
    it("is a named button that does not submit forms by default", () => {
        render(<Button>Save</Button>);

        expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
    });

    it("stays focusable but ignores clicks while loading", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(
            <Button loading onClick={onClick}>
                Save
            </Button>,
        );
        const button = screen.getByRole("button", { name: "Save" });

        await user.click(button);

        expect(onClick).not.toHaveBeenCalled();
        expect(button).toHaveAttribute("aria-busy", "true");
        expect(button).toHaveAttribute("aria-disabled", "true");
        expect(button).toHaveFocus();
    });
});
