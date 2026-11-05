import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../../../../../src/components/input/button";

describe("Button", () => {
    it("should be a named button that does not submit forms by default", () => {
        render(<Button>Save</Button>);

        expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
    });

    it("should stay focusable but ignore clicks while loading", async () => {
        const user = userEvent.setup();
        const onClick = jest.fn();
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

    it("should let a later class name win over the variant's", () => {
        render(<Button className="px-8">Save</Button>);

        expect(screen.getByRole("button", { name: "Save" })).toHaveClass("px-8");
        expect(screen.getByRole("button", { name: "Save" })).not.toHaveClass("px-5");
    });
});
