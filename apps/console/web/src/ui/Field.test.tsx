import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";

describe("Field", () => {
    it("labels its control", () => {
        render(<Field label="dApp name">{(control) => <input {...control} />}</Field>);

        const input = screen.getByLabelText("dApp name");
        expect(input).not.toHaveAttribute("aria-describedby");
        expect(input).not.toHaveAttribute("aria-invalid");
    });

    it("describes its control with the hint and the error, and marks it invalid", () => {
        render(
            <Field label="Logo URL" hint="An https URL." error="Use https.">
                {(control) => <input {...control} />}
            </Field>,
        );

        const input = screen.getByLabelText("Logo URL");
        expect(input).toHaveAccessibleDescription("An https URL. Use https.");
        expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("announces an error when it appears", () => {
        const { rerender } = render(<Field label="Owner email">{(control) => <input {...control} />}</Field>);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();

        rerender(
            <Field label="Owner email" error="Enter a valid email address.">
                {(control) => <input {...control} />}
            </Field>,
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    });

    it("shows whether the field is required next to its label, not in it", () => {
        render(
            <Field label="dApp name" tag="required">
                {(control) => <input {...control} />}
            </Field>,
        );

        expect(screen.getByLabelText("dApp name")).toBeInTheDocument();
        expect(screen.getByText("required")).toBeInTheDocument();
        expect(screen.getByLabelText("dApp name")).toBeRequired();
    });
});
