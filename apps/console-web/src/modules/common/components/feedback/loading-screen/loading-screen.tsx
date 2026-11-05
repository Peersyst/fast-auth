import { Spinner } from "@frontend/design-system-react/spinner";
import { useTranslate } from "@frontend/locale/react";

export function LoadingScreen(): React.JSX.Element {
    const translate = useTranslate();
    return (
        <div className="flex items-center justify-center gap-3 px-4 py-16 text-ink-subtle" role="status">
            <Spinner />
            {translate("loading")}
        </div>
    );
}
