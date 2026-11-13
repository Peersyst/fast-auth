import { forwardRef, ForwardedRef } from "react";
import { cn } from "../../../utils";
import { pageTitleVariants } from "./page-title.styles";
import { PageTitleProps } from "./page-title.types";

export const PageTitle = forwardRef(function PageTitle(
    { size, className, ...rest }: PageTitleProps,
    ref: ForwardedRef<HTMLHeadingElement>,
): React.JSX.Element {
    return <h1 {...rest} ref={ref} className={cn(pageTitleVariants({ size }), className)} />;
});
