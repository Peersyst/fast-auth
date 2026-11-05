import { ErrorIcon, InfoIcon, TipIcon, WarningIcon } from "../../icons";
import { cn } from "../../../utils";
import { calloutIconVariants, calloutVariants } from "./callout.styles";
import { CalloutProps } from "./callout.types";

const ICONS = { info: InfoIcon, tip: TipIcon, warning: WarningIcon, error: ErrorIcon };

export function Callout({ tone, id, title, children, className }: CalloutProps): React.JSX.Element {
    const Icon = ICONS[tone];
    return (
        <div id={id} className={cn(calloutVariants({ tone }), className)} role={tone === "error" ? "alert" : undefined}>
            <span className={calloutIconVariants({ tone })}>
                <Icon />
            </span>
            <div className="flex min-w-0 flex-col gap-2 wrap-anywhere">
                {title && <p className="font-semibold">{title}</p>}
                {children}
            </div>
        </div>
    );
}
