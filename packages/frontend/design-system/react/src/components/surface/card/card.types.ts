import { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLElement> & {
    as?: "section" | "article" | "div";
};

/**
 * `split` puts the title at the start and a meta line or an action at the end. `inline` lines up an icon, the title and a note.
 */
export type CardHeaderVariant = "split" | "inline";

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
    variant: CardHeaderVariant;
};

export type CardBodyProps = HTMLAttributes<HTMLElement> & {
    as?: "div" | "p";
};
