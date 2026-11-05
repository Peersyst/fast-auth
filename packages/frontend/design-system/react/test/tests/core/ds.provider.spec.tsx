import { render } from "@testing-library/react";
import { DSProvider } from "../../../src/core";

describe("DSProvider", () => {
    it("should force the chosen theme on the document", () => {
        render(<DSProvider themeMode="dark">content</DSProvider>);

        expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });

    it("should follow the browser's color scheme for the system theme", () => {
        const { rerender } = render(<DSProvider themeMode="light">content</DSProvider>);
        expect(document.documentElement).toHaveAttribute("data-theme", "light");

        rerender(<DSProvider themeMode="system">content</DSProvider>);

        expect(document.documentElement).not.toHaveAttribute("data-theme");
    });
});
