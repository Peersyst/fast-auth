import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../../../../../utils";
import { ThemeToggle } from "../../../../../../src/modules/common/containers/theme-toggle/theme-toggle";

describe("ThemeToggle", () => {
    afterEach(() => {
        Reflect.deleteProperty(window, "matchMedia");
    });

    it("should follow the system theme by default", () => {
        render(<ThemeToggle />);

        expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
        expect(document.documentElement).not.toHaveAttribute("data-theme");
    });

    it("should offer the light theme when the system prefers dark", () => {
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: (query: string) => ({ matches: true, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() }),
        });

        render(<ThemeToggle />);

        expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
    });

    it("should switch, apply and remember the theme", async () => {
        const user = userEvent.setup();
        render(<ThemeToggle />);

        await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));

        expect(document.documentElement).toHaveAttribute("data-theme", "dark");
        await waitFor(() => expect(JSON.parse(localStorage.getItem("settings")!)).toEqual({ theme: "dark" }));

        await user.click(screen.getByRole("button", { name: "Switch to light theme" }));

        expect(document.documentElement).toHaveAttribute("data-theme", "light");
        await waitFor(() => expect(JSON.parse(localStorage.getItem("settings")!)).toEqual({ theme: "light" }));
    });
});
