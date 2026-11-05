import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../../../../../utils";
import { ThemeSelect } from "../../../../../../src/modules/common/containers/theme-select/theme-select";

describe("ThemeSelect", () => {
    it("should follow the system theme by default", () => {
        render(<ThemeSelect />);

        expect(screen.getByRole("combobox", { name: "Theme" })).toHaveValue("system");
        expect(document.documentElement).not.toHaveAttribute("data-theme");
    });

    it("should apply and remember the chosen theme", async () => {
        const user = userEvent.setup();
        render(<ThemeSelect />);

        await user.selectOptions(screen.getByRole("combobox", { name: "Theme" }), "Dark");

        expect(screen.getByRole("combobox", { name: "Theme" })).toHaveValue("dark");
        expect(document.documentElement).toHaveAttribute("data-theme", "dark");
        await waitFor(() => expect(JSON.parse(localStorage.getItem("settings")!)).toEqual({ theme: "dark" }));
    });
});
