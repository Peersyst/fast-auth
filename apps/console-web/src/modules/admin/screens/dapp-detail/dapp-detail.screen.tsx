import { Link, useLocation, useParams } from "react-router";
import { isDomainError } from "@frontend/core/domain/error";
import { ConsoleAdminErrors } from "@frontend/console-admin/domain/errors";
import { useGetDapp } from "@frontend/console-admin/ui/queries";
import { PageTitle } from "@frontend/design-system-react/page-title";
import { useTranslate } from "@frontend/locale/react";
import { LoadError, RefreshError } from "../../../common/components/feedback/load-error/load-error";
import { LoadingScreen } from "../../../common/components/feedback/loading-screen/loading-screen";
import { AdminDappView } from "../../containers/admin-dapp-view/admin-dapp-view";

const PAGE = "mx-auto my-0 flex max-w-[1088px] flex-col gap-6 pb-20 leading-[1.5]";

/**
 * The path of the list the dApp was opened from, kept in the navigation's state.
 * @returns The list's path with its search, or the plain list.
 */
function useListPath(): string {
    const state: unknown = useLocation().state;
    const search = typeof state === "object" && state !== null && "listSearch" in state ? state.listSearch : undefined;
    return typeof search === "string" ? `/admin/dapps${search}` : "/admin/dapps";
}

export function DappDetailScreen(): React.JSX.Element {
    const translate = useTranslate();
    const { id = "" } = useParams();
    const dapp = useGetDapp(id);
    const listPath = useListPath();

    if (dapp.data === undefined) {
        if (!dapp.isError) return <LoadingScreen />;
        if (isDomainError(dapp.error) && dapp.error.message === ConsoleAdminErrors.DAPP_NOT_FOUND) {
            return (
                <section className={PAGE}>
                    <PageTitle size="medium">{translate("admin.dapp.notFound")}</PageTitle>
                    <p>
                        <Link to={listPath} className="text-link">
                            {translate("admin.dapp.back")}
                        </Link>
                    </p>
                </section>
            );
        }
        return (
            <LoadError
                title={translate("admin.dapp.loadError")}
                error={dapp.error}
                onRetry={() => void dapp.refetch()}
                retrying={dapp.isFetching}
            />
        );
    }
    return (
        <div className={PAGE}>
            {dapp.isError && <RefreshError error={dapp.error} />}
            <AdminDappView key={dapp.data.id} dapp={dapp.data} listPath={listPath} />
        </div>
    );
}
