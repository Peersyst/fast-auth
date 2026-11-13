import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { PageTitle } from "../../../../../src/components/display/page-title";

describe("PageTitle", () => {
    it("should be the page's level one heading", () => {
        render(<PageTitle size="medium">dApps</PageTitle>);

        expect(screen.getByRole("heading", { level: 1, name: "dApps" })).toBeInTheDocument();
    });

    it("should take focus through its ref", () => {
        const ref = createRef<HTMLHeadingElement>();
        render(
            <PageTitle ref={ref} tabIndex={-1} size="large">
                Acme Wallet
            </PageTitle>,
        );

        ref.current?.focus();

        expect(screen.getByRole("heading", { level: 1, name: "Acme Wallet" })).toHaveFocus();
    });

    it("should keep its line height next to its size", () => {
        render(<PageTitle size="medium">dApps</PageTitle>);

        expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-[36px]", "leading-[1.05]");
    });

    it("should let a later class name win over the size's", () => {
        render(
            <PageTitle size="large" className="text-[48px]">
                Acme Wallet
            </PageTitle>,
        );

        expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-[48px]");
        expect(screen.getByRole("heading", { level: 1 })).not.toHaveClass("text-[40px]");
    });
});
