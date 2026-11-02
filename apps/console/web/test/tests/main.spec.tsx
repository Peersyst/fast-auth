import { waitFor } from "@testing-library/react";

const firstRender: { theme: string | null | undefined } = { theme: undefined };

jest.mock("../../src/app/App", () => ({
    App: () => {
        if (firstRender.theme === undefined) firstRender.theme = document.documentElement.getAttribute("data-theme");
        return null;
    },
}));

it("should apply the stored theme before the app first renders", async () => {
    localStorage.setItem("console.theme", "dark");
    document.body.innerHTML = '<div id="root"></div>';

    await import("../../src/main");

    await waitFor(() => expect(firstRender.theme).toBe("dark"));
});
