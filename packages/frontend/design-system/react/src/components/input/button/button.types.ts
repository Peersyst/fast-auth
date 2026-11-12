import { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

export type ButtonSize = "medium" | "small";

export type ButtonLook = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook & { loading?: boolean };
