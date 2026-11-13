import { badgeVariants } from "./badge.styles";
import { BadgeProps } from "./badge.types";

export function Badge({ tone, children }: BadgeProps): React.JSX.Element {
    return <span className={badgeVariants({ tone })}>{children}</span>;
}
