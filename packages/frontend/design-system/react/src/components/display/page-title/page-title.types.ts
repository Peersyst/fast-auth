import { HTMLAttributes } from "react";

export type PageTitleSize = "medium" | "large";

export type PageTitleProps = HTMLAttributes<HTMLHeadingElement> & {
    size: PageTitleSize;
};
