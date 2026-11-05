import { FormEvent, useEffect, useRef } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router";
import { Button } from "@frontend/design-system-react/button";
import { SearchIcon } from "@frontend/design-system-react/icons";
import { PageTitle } from "@frontend/design-system-react/page-title";
import { useGetDapps } from "@frontend/console-admin/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { AdminDappDto, DappOrderBy, DappStatus } from "@shared/console";
import { MAX_PAGE, SEARCH_MAX_LENGTH } from "@shared/modules/dapp";
import { LoadError, RefreshError } from "../../../common/components/feedback/load-error/load-error";
import { LoadingScreen } from "../../../common/components/feedback/loading-screen/loading-screen";
import { DappsTable, DappsTableDateColumn } from "../../components/dapps-table/dapps-table";
import { AutoApprovalSwitch } from "../../containers/auto-approval-switch/auto-approval-switch";

type View = "review" | DappStatus | "all";

const VIEWS: View[] = ["review", "pending", "approved", "rejected", "removed", "all"];

/**
 * Whether ordering by the field reads oldest/newest or ascending/descending.
 */
const ORDER_KINDS: Record<DappOrderBy, "date" | "text"> = {
    submittedAt: "date",
    updatedAt: "date",
    name: "text",
    status: "text",
};
const ORDER_BYS = Object.keys(ORDER_KINDS) as DappOrderBy[];

const SELECT_BOX =
    "inline-flex h-[38px] items-center gap-2 rounded-[12px] border border-border-strong bg-surface py-0 pr-1.5 pl-3 focus-within:outline-2 focus-within:outline-focus focus-within:outline-offset-2";
const SELECT_LABEL = "font-mono text-2xs font-medium tracking-kicker whitespace-nowrap text-ink-subtle uppercase";
const SELECT = "h-full cursor-pointer border-0 bg-transparent text-base focus-visible:outline-none";

/**
 * Reads a search parameter that must be one of the allowed values.
 * @param values The allowed values.
 * @param value The parameter.
 * @returns The value, or `undefined` when it is not allowed.
 */
function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
    return values.find((allowed) => allowed === value);
}

export function DappsListScreen(): React.JSX.Element {
    const translate = useTranslate();
    const [params, setParams] = useSearchParams();
    const listSearch = useLocation().search;
    const view = oneOf(VIEWS, params.get("view")) ?? "review";
    const q = params.get("q") ?? "";
    const page = Math.min(MAX_PAGE, Math.max(1, Math.floor(Number(params.get("page"))) || 1));
    const orderBy = oneOf(ORDER_BYS, params.get("orderBy"));
    const order = params.get("order") === "desc" ? "desc" : "asc";
    const orderKind = ORDER_KINDS[orderBy ?? "submittedAt"];
    const dateColumn: DappsTableDateColumn =
        orderBy === "updatedAt"
            ? { label: translate("admin.dapps.orderBy.updatedAt"), of: (dapp: AdminDappDto) => dapp.updatedAt }
            : orderBy === undefined && view === "review"
              ? { label: translate("admin.dapps.waitingSince"), of: (dapp: AdminDappDto) => dapp.pendingChangeAt ?? dapp.submittedAt }
              : { label: translate("admin.dapps.orderBy.submittedAt"), of: (dapp: AdminDappDto) => dapp.submittedAt };
    const searchInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (searchInput.current) searchInput.current.value = q;
    }, [q]);
    const list = useGetDapps({
        needsReview: view === "review",
        status: view === "review" || view === "all" ? undefined : view,
        q: q || undefined,
        page,
        orderBy,
        order: order === "desc" ? "DESC" : "ASC",
    });

    const update = (changes: Record<string, string | undefined>): void => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        if (!("page" in changes)) next.delete("page");
        setParams(next);
    };

    const search = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
        update(query && view === "review" ? { q: query, view: "all" } : { q: query || undefined });
    };

    const pages = Math.max(1, list.data?.pages ?? 1);
    const empty = list.data?.items.length === 0;
    // While the next query loads, the previous rows stay on screen, so the live region keeps describing them.
    const announcement = useRef("");
    if (list.data && !list.isPlaceholderData) {
        announcement.current = empty
            ? translate(view === "review" && !q ? "admin.dapps.nothingToReview" : "admin.dapps.noMatch")
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
                <AutoApprovalSwitch />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                    role="group"
                    aria-label={translate("admin.dapps.filter")}
                    className="flex flex-wrap gap-1 rounded-pill border border-border bg-surface p-1"
                >
                    {VIEWS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className="inline-flex h-8 cursor-pointer items-center rounded-pill border-0 bg-transparent px-3 py-0 text-sm font-semibold text-ink-subtle hover:text-ink aria-pressed:bg-chip-strong-bg aria-pressed:text-chip-strong-ink"
                            aria-pressed={option === view}
                            onClick={() => {
                                if (option !== view) update({ view: option === "review" ? undefined : option });
                            }}
                        >
                            {option === "review" || option === "all"
                                ? translate(`admin.dapps.views.${option}`)
                                : translate(`dapp.status.${option}`)}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className={SELECT_BOX}>
                        <span className={SELECT_LABEL}>{translate("admin.dapps.sortBy")}</span>
                        <select
                            className={SELECT}
                            value={orderBy ?? (view === "review" ? "" : "submittedAt")}
                            onChange={(event) => update({ orderBy: event.target.value })}
                        >
                            {view === "review" && <option value="">{translate("admin.dapps.waitingSince")}</option>}
                            {ORDER_BYS.map((option) => (
                                <option key={option} value={option}>
                                    {translate(`admin.dapps.orderBy.${option}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={SELECT_BOX}>
                        <span className={SELECT_LABEL}>{translate("admin.dapps.order")}</span>
                        <select
                            className={SELECT}
                            value={order}
                            onChange={(event) => update({ order: event.target.value === "desc" ? "desc" : undefined })}
                        >
                            <option value="asc">{translate(`admin.dapps.orders.${orderKind}.asc`)}</option>
                            <option value="desc">{translate(`admin.dapps.orders.${orderKind}.desc`)}</option>
                        </select>
                    </label>
                    <form
                        role="search"
                        className="flex h-[38px] w-[280px] max-w-full items-center gap-2 rounded-[12px] border border-border-strong bg-surface px-3 py-0 text-faint focus-within:outline-2 focus-within:outline-focus focus-within:outline-offset-2 [&_svg]:flex-none"
                        onSubmit={search}
                    >
                        <SearchIcon />
                        <input
                            ref={searchInput}
                            name="q"
                            className="min-w-0 flex-auto border-0 bg-transparent text-base text-ink placeholder:text-faint focus-visible:outline-none"
                            type="search"
                            defaultValue={q}
                            maxLength={SEARCH_MAX_LENGTH}
                            aria-label={translate("admin.dapps.search")}
                            placeholder={translate("admin.dapps.searchPlaceholder")}
                        />
                    </form>
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
                    {!empty && (
                        <DappsTable dapps={list.data.items} dateColumn={dateColumn} busy={list.isPlaceholderData} listSearch={listSearch} />
                    )}
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
                                    onClick={() => update({ page: String(page - 1) })}
                                >
                                    {translate("admin.dapps.previous")}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="small"
                                    disabled={page >= pages}
                                    onClick={() => update({ page: String(page + 1) })}
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
