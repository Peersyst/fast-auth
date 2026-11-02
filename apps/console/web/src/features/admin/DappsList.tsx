import { useEffect, useRef, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { MAX_PAGE, SEARCH_MAX_LENGTH } from "@shared/console-domain/field-rules";
import { MAU_LABELS } from "@shared/console-domain/dapp";
import type { AdminDapp, DappOrderBy, DappStatus } from "../../api/client";
import { useAdminDapps } from "../../api/hooks";
import { LoadError, RefreshError } from "../../app/LoadError";
import { LoadingScreen } from "../../app/LoadingScreen";
import { formatDateTime } from "../../lib/format";
import { initials } from "../../lib/initials";
import { Button, buttonClassName } from "../../ui/Button";
import { SearchIcon } from "../../ui/icons";
import { STATUS_BADGES, StatusBadge } from "../dapp/StatusBadge";
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

const SELECT_BOX =
    "inline-flex h-[38px] items-center gap-2 rounded-[12px] border border-border-strong bg-surface py-0 pr-1.5 pl-3 focus-within:outline-2 focus-within:outline-focus focus-within:outline-offset-2";
const SELECT_LABEL = "font-mono text-[11px] font-medium tracking-kicker whitespace-nowrap text-ink-subtle uppercase";
const SELECT = "h-full cursor-pointer border-0 bg-transparent text-[14px] focus-visible:outline-none";
const HEAD = "border-b border-b-border bg-canvas px-4 py-3 font-mono text-[10px] font-medium tracking-kicker text-ink-subtle uppercase";
const CELL = "border-b border-b-border px-4 text-ink-2 [tr:last-child_&]:border-b-0";
const ACTIONS = "text-right whitespace-nowrap";
function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
    return values.find((allowed) => allowed === value);
}

export function DappsList() {
    const [params, setParams] = useSearchParams();
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
        <div className="mx-auto my-0 flex max-w-[1088px] flex-col gap-6 pb-20 leading-[1.5]">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-[1_1_360px] flex-col gap-1.5">
                    <h1 className="text-[36px] leading-[1.05] tracking-[-0.025em] wrap-anywhere">dApps</h1>
                    <p className="text-[14px] text-ink-subtle">
                        Applications registered for NEAR Auth. Approving one creates its Auth0 application and emails the client ID to its
                        owner.
                    </p>
                </div>
                <AutoApprovalSwitch />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                    role="group"
                    aria-label="Filter by status"
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
                            {VIEW_LABELS[option]}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className={SELECT_BOX}>
                        <span className={SELECT_LABEL}>Sort by</span>
                        <select
                            className={SELECT}
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
                    <label className={SELECT_BOX}>
                        <span className={SELECT_LABEL}>Order</span>
                        <select
                            className={SELECT}
                            value={order}
                            onChange={(event) => update({ order: event.target.value === "desc" ? "desc" : undefined })}
                        >
                            <option value="asc">{ascLabel}</option>
                            <option value="desc">{descLabel}</option>
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
                            className="min-w-0 flex-auto border-0 bg-transparent text-[14px] text-ink placeholder:text-faint focus-visible:outline-none"
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
                        <div className="overflow-x-auto rounded-[12px] border border-border bg-surface">
                            <table
                                className="w-full min-w-[880px] border-collapse text-[14px] aria-busy:opacity-60"
                                aria-busy={list.isPlaceholderData || undefined}
                            >
                                <thead>
                                    <tr>
                                        <th scope="col" className={`${HEAD} text-left`}>
                                            dApp
                                        </th>
                                        <th scope="col" className={`${HEAD} text-left`}>
                                            Expected MAU
                                        </th>
                                        <th scope="col" className={`${HEAD} text-left`}>
                                            {dateColumn.label}
                                        </th>
                                        <th scope="col" className={`${HEAD} text-left`}>
                                            Status
                                        </th>
                                        <th scope="col" className={`${HEAD} ${ACTIONS}`}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.data.items.map((dapp) => (
                                        <tr key={dapp.id}>
                                            <td className={`${CELL} py-[14px]`}>
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-surface-muted text-[14px] font-bold text-ink-2"
                                                        aria-hidden="true"
                                                    >
                                                        {initials(dapp.name)}
                                                    </span>
                                                    <div className="flex min-w-0 flex-col gap-0.5">
                                                        <Link
                                                            to={`/admin/dapps/${dapp.id}`}
                                                            className="font-semibold text-ink no-underline hover:underline"
                                                        >
                                                            {dapp.name}
                                                        </Link>
                                                        <span className="text-sm text-ink-subtle">
                                                            <OwnerEmail email={dapp.ownerEmail} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`${CELL} py-[14px]`}>{MAU_LABELS[dapp.mauBracket]}</td>
                                            <td className={`${CELL} py-[14px] whitespace-nowrap`}>{formatDateTime(dateColumn.of(dapp))}</td>
                                            <td className={`${CELL} py-[14px]`}>
                                                <span className="inline-flex flex-wrap gap-2">
                                                    <StatusBadge status={dapp.status} />
                                                    {dapp.pendingChange && <StatusBadge status="change-under-review" />}
                                                </span>
                                            </td>
                                            <td className={`${CELL} py-2.5 ${ACTIONS}`}>
                                                <Link
                                                    to={`/admin/dapps/${dapp.id}`}
                                                    className={buttonClassName({ variant: "secondary", size: "small" })}
                                                >
                                                    View<span className="sr-only"> {dapp.name}</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                            <nav className="flex gap-2" aria-label="Pages">
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
