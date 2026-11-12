import { ReactNode } from "react";

export type FieldControlProps = {
    id: string;
    className: string | undefined;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
    "aria-required": true | undefined;
};

export type FieldTag = "required" | "optional";

export type FieldProps = {
    label: ReactNode;
    tag?: FieldTag;
    /**
     * The visible text of the tag, such as "required".
     */
    tagText?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
    children: (control: FieldControlProps) => ReactNode;
};
