import { WarningIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";

export function RejectedStatus(): React.JSX.Element {
    const translate = useTranslate();
    return (
        <section className="flex flex-col gap-4 rounded-lg border border-danger-border bg-danger-bg px-6 py-5 text-base text-danger-ink-strong">
            <div className="flex gap-3">
                <span className="mt-0.5 flex flex-none text-danger-ink">
                    <WarningIcon />
                </span>
                <div className="flex min-w-0 flex-col gap-1.5 text-danger-ink wrap-anywhere">
                    <p className="text-md font-semibold">{translate("myDapp.rejected.title")}</p>
                </div>
            </div>
        </section>
    );
}
