import { DomainError } from "@frontend/core/domain/error";
import { ConsoleAuthErrors } from "@frontend/console-auth/domain/errors";
import { useTranslate } from "@frontend/locale/react";
import { LoadError } from "../../components/feedback/load-error/load-error";

const UNREACHABLE = new DomainError(ConsoleAuthErrors.CONSOLE_UNREACHABLE);

export function StartError(): React.JSX.Element {
    const translate = useTranslate();
    return <LoadError title={translate("loadError.start")} error={UNREACHABLE} onRetry={() => window.location.reload()} retrying={false} />;
}
