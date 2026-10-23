import { expect, it, vi } from "vitest";

const firstRender = vi.hoisted(() => ({ theme: undefined as string | null | undefined }));

vi.mock("./app/App", () => ({
    App: () => {
        if (firstRender.theme === undefined) firstRender.theme = document.documentElement.getAttribute("data-theme");
        return null;
    },
}));

it("applies the stored theme before the app first renders", async () => {
    localStorage.setItem("console.theme", "dark");
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main");

    await vi.waitFor(() => expect(firstRender.theme).toBe("dark"));
});
