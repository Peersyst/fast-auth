import { useRef } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router";
import { Button } from "@frontend/design-system-react/button";
import { PageTitle } from "@frontend/design-system-react/page-title";
import { useGetDapps } from "@frontend/console-admin/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { MAX_PAGE } from "@shared/modules/dapp";
import { LoadError, RefreshError } from "../../../common/components/feedback/load-error/load-error";
import { LoadingScreen } from "../../../common/components/feedback/loading-screen/loading-screen";
import { DappsTable } from "../../components/dapps-table/dapps-table";

export function DappsListScreen(): React.JSX.Element {
    const translate = useTranslate();
    const [params, setParams] = useSearchParams();
    const listSearch = useLocation().search;
    const page = Math.min(MAX_PAGE, Math.max(1, Math.floor(Number(params.get("page"))) || 1));
    const list = useGetDapps(page);

    const pages = Math.max(1, list.data?.pages ?? 1);
    const empty = list.data?.items.length === 0;
    // While the next query loads, the previous rows stay on screen, so the live region keeps describing them.
    const announcement = useRef("");
    if (list.data && !list.isPlaceholderData) {
        announcement.current = empty
            ? translate("admin.dapps.empty")
            : translate("admin.dapps.showing", {
                  shown: list.data.items.length,
                  count: list.data.totalItems,
                  page: list.data.currentPage,
                  pages,
              });
    }

    const overshot = empty && !list.isPlaceholderData && page > 1;
    const stepBack = new URLSearchParams(params);
    const target = Math.min(pages, page - 1);
    if (target > 1) stepBack.set("page", String(target));
    else stepBack.delete("page");

    return (
        <div className="mx-auto my-0 flex max-w-[1088px] flex-col gap-6 pb-20 leading-[1.5]">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-[1_1_360px] flex-col gap-1.5">
                    <PageTitle size="medium">{translate("admin.dapps.title")}</PageTitle>
                    <p className="text-base text-ink-subtle">{translate("admin.dapps.description")}</p>
                </div>
            </div>

            {overshot ? (
                <Navigate replace to={{ search: stepBack.toString() }} />
            ) : list.isPending ? (
                <LoadingScreen />
            ) : list.data === undefined ? (
                <LoadError
                    title={translate("admin.dapps.loadError")}
                    error={list.error}
                    onRetry={() => void list.refetch()}
                    retrying={list.isFetching}
                />
            ) : (
                <>
                    {list.error && <RefreshError error={list.error} />}
                    {!empty && <DappsTable dapps={list.data.items} busy={list.isPlaceholderData} listSearch={listSearch} />}
                    <div
                        className={
                            empty
                                ? "rounded-[12px] border border-border bg-surface px-4 py-12 text-center text-ink-subtle"
                                : "flex flex-wrap items-center justify-between gap-3 text-sm text-ink-subtle"
                        }
                    >
                        <p role="status">{announcement.current}</p>
                        {!empty && (
                            <nav className="flex gap-2" aria-label={translate("admin.dapps.pages")}>
                                <Button
                                    variant="secondary"
                                    size="small"
                                    disabled={page <= 1}
                                    onClick={() => setParams({ page: String(page - 1) })}
                                >
                                    {translate("admin.dapps.previous")}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="small"
                                    disabled={page >= pages}
                                    onClick={() => setParams({ page: String(page + 1) })}
                                >
                                    {translate("admin.dapps.next")}
                                </Button>
                            </nav>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
