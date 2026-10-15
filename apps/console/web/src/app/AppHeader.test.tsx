import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Me } from "../api/client";
import { AppHeader } from "./AppHeader";

function renderAccount(account: Parameters<typeof AppHeader>[0]["account"], onSignOut = vi.fn()) {
    render(
        <MemoryRouter>
            <AppHeader account={account} onSignOut={onSignOut} />
        </MemoryRouter>,
    );
}

function renderHeader(role: Me["role"], onSignOut = vi.fn()) {
    const email = `${role}@acme.xyz`;
    renderAccount({ email, session: { email, role, emailVerified: true } }, onSignOut);
}

describe("AppHeader", () => {
    afterEach(() => {
        document.documentElement.removeAttribute("data-theme");
    });

    it("gives an admin the dApps list and no My dApp link", () => {
        renderHeader("admin");

        const nav = screen.getByRole("navigation", { name: "Main" });
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "dApps" })).toHaveAttribute("href", "/admin/dapps");
        expect(screen.queryByRole("link", { name: "My dApp" })).not.toBeInTheDocument();
        expect(nav).toHaveTextContent("dAppsDocs");
    });

    it("gives a user My dApp and no admin link", () => {
        renderHeader("user");

        expect(screen.getByRole("link", { name: "My dApp" })).toHaveAttribute("href", "/");
        expect(screen.queryByRole("link", { name: "dApps" })).not.toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
        expect(screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/admin"))).toEqual([]);
    });

    it("shows the email and signs out", async () => {
        const onSignOut = vi.fn();
        renderHeader("user", onSignOut);

        expect(screen.getByText("user@acme.xyz")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

        expect(onSignOut).toHaveBeenCalledOnce();
    });

    it("gives a signed-out visitor the theme and no account or navigation", () => {
        renderAccount(undefined);

        expect(screen.getByRole("link", { name: "NEAR Auth console home" })).toHaveAttribute("href", "/");
        expect(screen.getByRole("combobox", { name: "Theme" })).toBeInTheDocument();
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    });

    it("lets a signed-in user without a verified session sign out, without navigation", async () => {
        const onSignOut = vi.fn();
        renderAccount({ email: "dev@acme.xyz", session: undefined }, onSignOut);

        expect(screen.getByText("dev@acme.xyz")).toBeInTheDocument();
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

        expect(onSignOut).toHaveBeenCalledOnce();
    });

    it("lets a signed-in user switch the theme", async () => {
        renderHeader("user");

        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Theme" }), "dark");

        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
        expect(localStorage.getItem("console.theme")).toBe("dark");
    });
});
