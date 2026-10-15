import { useEffect, useRef, type FormEvent } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { MAX_PAGE, SEARCH_MAX_LENGTH } from "../../../../src/domain/field-rules";
import type { AdminDapp, DappOrderBy, DappStatus } from "../../api/client";
import { useAdminDapps } from "../../api/hooks";
import { LoadError, RefreshError } from "../../app/LoadError";
import { LoadingScreen } from "../../app/LoadingScreen";
import { MAU_LABELS } from "../../lib/dapp-fields";
import { formatDateTime } from "../../lib/format";
import { initials } from "../../lib/initials";
import { Button, buttonClassName } from "../../ui/Button";
import { SearchIcon } from "../../ui/icons";
import { STATUS_BADGES, StatusBadge } from "../dapp/StatusBadge";
import styles from "./admin.module.css";
import { AutoApprovalSwitch } from "./AutoApprovalSwitch";
import { OwnerEmail } from "./Email";

type View = "review" | DappStatus | "all";

const VIEW_LABELS: Record<View, string> = {
    review: "Needs review",
    pending: STATUS_BADGES.pending.label,
    approved: STATUS_BADGES.approved.label,
    rejected: STATUS_BADGES.rejected.label,
    removed: STATUS_BADGES.removed.label,
    all: "All",
};
const VIEWS = Object.keys(VIEW_LABELS) as View[];

const ORDER_OPTIONS: Record<DappOrderBy, { label: string; asc: string; desc: string }> = {
    submittedAt: { label: "Submitted", asc: "Oldest first", desc: "Newest first" },
    updatedAt: { label: "Last updated", asc: "Oldest first", desc: "Newest first" },
    name: { label: "Name", asc: "Ascending", desc: "Descending" },
    status: { label: "Status", asc: "Ascending", desc: "Descending" },
};
const ORDER_BYS = Object.keys(ORDER_OPTIONS) as DappOrderBy[];

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
    return values.find((allowed) => allowed === value);
}

export function DappsList() {
    const [params, setParams] = useSearchParams();
    const listState = { listSearch: useLocation().search };
    const view = oneOf(VIEWS, params.get("view")) ?? "review";
    const q = params.get("q") ?? "";
    const page = Math.min(MAX_PAGE, Math.max(1, Math.floor(Number(params.get("page"))) || 1));
    const orderBy = oneOf(ORDER_BYS, params.get("orderBy"));
    const order = params.get("order") === "desc" ? "desc" : "asc";
    const { asc: ascLabel, desc: descLabel } = ORDER_OPTIONS[orderBy ?? "submittedAt"];
    const dateColumn: { label: string; of: (dapp: AdminDapp) => string } =
        orderBy === "updatedAt"
            ? { label: "Last updated", of: (dapp) => dapp.updatedAt }
            : orderBy === undefined && view === "review"
              ? { label: "Waiting since", of: (dapp) => dapp.pendingChangeAt ?? dapp.submittedAt }
              : { label: "Submitted", of: (dapp) => dapp.submittedAt };
    const searchInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (searchInput.current) searchInput.current.value = q;
    }, [q]);
    const list = useAdminDapps({
        needsReview: view === "review",
        status: view === "review" || view === "all" ? undefined : view,
        q: q || undefined,
        page,
        orderBy,
        order,
    });

    const update = (changes: Record<string, string | undefined>) => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        if (!("page" in changes)) next.delete("page");
        setParams(next);
    };

    const search = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
        update(query && view === "review" ? { q: query, view: "all" } : { q: query || undefined });
    };

    const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
    const empty = list.data?.items.length === 0;
    // While the next query loads, the previous rows stay on screen, so the live region keeps describing them.
    const announcement = useRef("");
    if (list.data && !list.isPlaceholderData) {
        announcement.current = empty
            ? view === "review" && !q
                ? "Nothing needs review."
                : "No dApps match."
            : `Showing ${list.data.items.length} of ${list.data.total} ${list.data.total === 1 ? "dApp" : "dApps"} · page ${list.data.page} of ${pages}`;
    }

    const overshot = empty && !list.isPlaceholderData && page > 1;
    const stepBack = new URLSearchParams(params);
    const target = Math.min(pages, page - 1);
    if (target > 1) stepBack.set("page", String(target));
    else stepBack.delete("page");

    return (
        <div className={styles.page}>
            <div className={styles.listHead}>
                <div className={styles.titleBlock}>
                    <h1 className={styles.title}>dApps</h1>
                    <p className={styles.lede}>
                        Applications registered for NEAR Auth. Approving one creates its Auth0 application and emails the client ID to its
                        owner.
                    </p>
                </div>
                <AutoApprovalSwitch />
            </div>

            <div className={styles.toolbar}>
                <div role="group" aria-label="Filter by status" className={styles.filters}>
                    {VIEWS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={styles.filter}
                            aria-pressed={option === view}
                            onClick={() => {
                                if (option !== view) update({ view: option === "review" ? undefined : option });
                            }}
                        >
                            {VIEW_LABELS[option]}
                        </button>
                    ))}
                </div>
                <div className={styles.toolbarEnd}>
                    <label className={styles.selectBox}>
                        <span>Sort by</span>
                        <select
                            value={orderBy ?? (view === "review" ? "" : "submittedAt")}
                            onChange={(event) => update({ orderBy: event.target.value })}
                        >
                            {view === "review" && <option value="">Waiting since</option>}
                            {Object.entries(ORDER_OPTIONS).map(([option, { label }]) => (
                                <option key={option} value={option}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.selectBox}>
                        <span>Order</span>
                        <select value={order} onChange={(event) => update({ order: event.target.value === "desc" ? "desc" : undefined })}>
                            <option value="asc">{ascLabel}</option>
                            <option value="desc">{descLabel}</option>
                        </select>
                    </label>
                    <form role="search" className={styles.search} onSubmit={search}>
                        <SearchIcon />
                        <input
                            ref={searchInput}
                            name="q"
                            type="search"
                            defaultValue={q}
                            maxLength={SEARCH_MAX_LENGTH}
                            aria-label="Search dApps"
                            placeholder="Search by name, email or client ID"
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
                    title="The dApps could not be loaded"
                    error={list.error}
                    onRetry={() => void list.refetch()}
                    retrying={list.isFetching}
                />
            ) : (
                <>
                    {list.isError && <RefreshError error={list.error} />}
                    {!empty && (
                        <div className={styles.tableWrap}>
                            <table className={styles.table} aria-busy={list.isPlaceholderData || undefined}>
                                <thead>
                                    <tr>
                                        <th scope="col">dApp</th>
                                        <th scope="col">Expected MAU</th>
                                        <th scope="col">{dateColumn.label}</th>
                                        <th scope="col">Status</th>
                                        <th scope="col" className={styles.actionsCell}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.data.items.map((dapp) => (
                                        <tr key={dapp.id}>
                                            <td>
                                                <div className={styles.dappCell}>
                                                    <span className={styles.initials} aria-hidden="true">
                                                        {initials(dapp.name)}
                                                    </span>
                                                    <div className={styles.dappName}>
                                                        <Link to={`/admin/dapps/${dapp.id}`} state={listState}>
                                                            {dapp.name}
                                                        </Link>
                                                        <span>
                                                            <OwnerEmail email={dapp.ownerEmail} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{MAU_LABELS[dapp.mauBracket]}</td>
                                            <td className={styles.nowrap}>{formatDateTime(dateColumn.of(dapp))}</td>
                                            <td>
                                                <span className={styles.badges}>
                                                    <StatusBadge status={dapp.status} />
                                                    {dapp.pendingChange && <StatusBadge status="change-under-review" />}
                                                </span>
                                            </td>
                                            <td className={styles.actionsCell}>
                                                <Link
                                                    to={`/admin/dapps/${dapp.id}`}
                                                    state={listState}
                                                    className={buttonClassName({ variant: "secondary", size: "small" })}
                                                >
                                                    View<span className={styles.srOnly}> {dapp.name}</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className={empty ? styles.empty : styles.pagination}>
                        <p role="status">{announcement.current}</p>
                        {!empty && (
                            <nav className={styles.pager} aria-label="Pages">
                                <Button
                                    variant="secondary"
                                    size="small"
                                    disabled={page <= 1}
                                    onClick={() => update({ page: String(page - 1) })}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="small"
                                    disabled={page >= pages}
                                    onClick={() => update({ page: String(page + 1) })}
                                >
                                    Next
                                </Button>
                            </nav>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
