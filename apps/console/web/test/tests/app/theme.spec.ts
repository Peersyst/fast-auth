import { applyTheme, readStoredTheme } from "../../../src/app/theme";

function theme() {
    return document.documentElement.getAttribute("data-theme");
}

describe("theme", () => {
    afterEach(() => {
        jest.restoreAllMocks();
        document.documentElement.removeAttribute("data-theme");
    });

    it("should follow the system theme by default", () => {
        expect(readStoredTheme()).toBe("system");
    });

    it("should read the saved theme", () => {
        localStorage.setItem("console.theme", "dark");

        expect(readStoredTheme()).toBe("dark");
    });

    it("should apply and save a chosen theme, and remove the attribute for system", () => {
        applyTheme("light");
        expect(theme()).toBe("light");
        expect(localStorage.getItem("console.theme")).toBe("light");

        applyTheme("system");
        expect(theme()).toBeNull();
        expect(localStorage.getItem("console.theme")).toBe("system");
    });

    it("should ignore an unknown saved value", () => {
        localStorage.setItem("console.theme", "sepia");

        expect(readStoredTheme()).toBe("system");
    });

    it("should work when storage is blocked", () => {
        jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });

        expect(readStoredTheme()).toBe("system");
        applyTheme("dark");
        expect(theme()).toBe("dark");
    });
});
