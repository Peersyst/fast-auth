import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, readStoredTheme } from "./theme";

function theme() {
    return document.documentElement.getAttribute("data-theme");
}

describe("theme", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.documentElement.removeAttribute("data-theme");
    });

    it("follows the system theme by default", () => {
        expect(readStoredTheme()).toBe("system");
    });

    it("reads the saved theme", () => {
        localStorage.setItem("console.theme", "dark");

        expect(readStoredTheme()).toBe("dark");
    });

    it("applies and saves a chosen theme, and removes the attribute for system", () => {
        applyTheme("light");
        expect(theme()).toBe("light");
        expect(localStorage.getItem("console.theme")).toBe("light");

        applyTheme("system");
        expect(theme()).toBeNull();
        expect(localStorage.getItem("console.theme")).toBe("system");
    });

    it("ignores an unknown saved value", () => {
        localStorage.setItem("console.theme", "sepia");

        expect(readStoredTheme()).toBe("system");
    });

    it("works when storage is blocked", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });

        expect(readStoredTheme()).toBe("system");
        applyTheme("dark");
        expect(theme()).toBe("dark");
    });
});
