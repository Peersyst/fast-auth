import { Link } from "react-router";
import { buttonClassName } from "@frontend/design-system-react/button";
import { useTranslate } from "@frontend/locale/react";
import { DappDto } from "@shared/console";
import { formatDateTime } from "../../../common/utils/format";
import { initials } from "../../../common/utils/initials";
import { StatusBadge } from "../../../dapp/components/status-badge/status-badge";

const HEAD = "border-b border-b-border bg-canvas px-4 py-3 font-mono text-3xs font-medium tracking-kicker text-ink-subtle uppercase";
const CELL = "border-b border-b-border px-4 text-ink-2 [tr:last-child_&]:border-b-0";
const ACTIONS = "text-right whitespace-nowrap";

export type DappsTableProps = {
    dapps: DappDto[];
    /**
     * Whether the rows are the previous page's, kept while the next loads.
     */
    busy: boolean;
    /**
     * The list's search, carried to a dApp so its breadcrumb comes back to the same list.
     */
    listSearch: string;
};

export function DappsTable({ dapps, busy, listSearch }: DappsTableProps): React.JSX.Element {
    const translate = useTranslate();
    const listState = { listSearch };
    return (
        <div className="overflow-x-auto rounded-[12px] border border-border bg-surface">
            <table className="w-full min-w-[880px] border-collapse text-base aria-busy:opacity-60" aria-busy={busy || undefined}>
                <thead>
                    <tr>
                        <th scope="col" className={`${HEAD} text-left`}>
                            {translate("admin.dapps.columns.dapp")}
                        </th>
                        <th scope="col" className={`${HEAD} text-left`}>
                            {translate("dapp.fields.mauBracket")}
                        </th>
                        <th scope="col" className={`${HEAD} text-left`}>
                            {translate("admin.dapps.columns.submitted")}
                        </th>
                        <th scope="col" className={`${HEAD} text-left`}>
                            {translate("admin.dapps.columns.status")}
                        </th>
                        <th scope="col" className={`${HEAD} ${ACTIONS}`}>
                            {translate("admin.dapps.columns.actions")}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {dapps.map((dapp) => (
                        <tr key={dapp.id}>
                            <td className={`${CELL} py-[14px]`}>
                                <div className="flex items-center gap-3">
                                    <span
                                        className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-surface-muted text-base font-bold text-ink-2"
                                        aria-hidden="true"
                                    >
                                        {initials(dapp.name)}
                                    </span>
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <Link
                                            to={`/admin/dapps/${dapp.id}`}
                                            state={listState}
                                            className="font-semibold text-ink no-underline hover:underline"
                                        >
                                            {dapp.name}
                                        </Link>
                                        <span className="text-sm text-ink-subtle">{dapp.ownerEmail}</span>
                                    </div>
                                </div>
                            </td>
                            <td className={`${CELL} py-[14px]`}>{translate(`dapp.mau.${dapp.mauBracket}`)}</td>
                            <td className={`${CELL} py-[14px] whitespace-nowrap`}>{formatDateTime(dapp.createdAt)}</td>
                            <td className={`${CELL} py-[14px]`}>
                                <span className="inline-flex flex-wrap gap-2">
                                    <StatusBadge status={dapp.status} />
                                    {dapp.pendingChange && <StatusBadge status="changeUnderReview" />}
                                </span>
                            </td>
                            <td className={`${CELL} py-2.5 ${ACTIONS}`}>
                                <Link
                                    to={`/admin/dapps/${dapp.id}`}
                                    state={listState}
                                    className={buttonClassName({ variant: "secondary", size: "small" })}
                                >
                                    {translate("admin.dapps.view")}
                                    <span className="sr-only"> {dapp.name}</span>
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
