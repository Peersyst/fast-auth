import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import { CheckCircleIcon, CheckIcon, ChevronRightIcon, XCircleIcon } from "@frontend/design-system-react/icons";
import { PageTitle } from "@frontend/design-system-react/page-title";
import {
    consoleAdminQueryKeys,
    useApproveChange,
    useApproveDapp,
    useRejectChange,
    useRejectDapp,
} from "@frontend/console-admin/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { DappDto } from "@shared/console";
import { ConfirmDialog } from "../../../common/containers/confirm-dialog/confirm-dialog";
import { useErrorMessage } from "../../../common/hooks/use-error-message";
import { useHeadingFocus } from "../../../common/hooks/use-heading-focus";
import { formatDateTime } from "../../../common/utils/format";
import { initials } from "../../../common/utils/initials";
import { StatusBadge } from "../../../dapp/components/status-badge/status-badge";
import { ChangeReview } from "../../components/change-review/change-review";
import { DappFacts } from "../../components/dapp-facts/dapp-facts";
import { DappRecord } from "../../components/dapp-record/dapp-record";

const DIALOG_NOTE = "text-sm text-ink-subtle";

type ActionKind = "approve" | "reject" | "approveChange" | "rejectChange";

export type AdminDappViewProps = {
    dapp: DappDto;
    /**
     * The path of the list the dApp was opened from, with its page.
     */
    listPath: string;
};

export function AdminDappView({ dapp, listPath }: AdminDappViewProps): React.JSX.Element {
    const translate = useTranslate();
    const queryClient = useQueryClient();
    const [action, setAction] = useState<ActionKind | null>(null);
    const mutations = {
        approve: useApproveDapp(),
        reject: useRejectDapp(),
        approveChange: useApproveChange(),
        rejectChange: useRejectChange(),
    };
    const run = action && mutations[action];
    const runError = useErrorMessage(run?.error);
    const { heading, focusHeadingAfterRender } = useHeadingFocus(false);

    const reload = (): Promise<void> => queryClient.refetchQueries({ queryKey: consoleAdminQueryKeys.detail(dapp.id) });
    const close = (): void => {
        setAction(null);
        run?.reset();
    };
    const settle = {
        onSuccess: (): void => {
            close();
            focusHeadingAfterRender();
        },
        onError: (): void => void reload(),
    };
    const failure = run?.isError && (
        <Callout tone="error" title={translate("admin.dapp.notDone")}>
            <p>{runError}</p>
        </Callout>
    );
    const loading = run?.isPending ?? false;

    return (
        <>
            <nav
                aria-label={translate("admin.dapp.breadcrumb")}
                className="flex items-center gap-2 text-sm text-ink-subtle [&_svg]:flex-none"
            >
                <Link to={listPath} className="text-ink-subtle no-underline hover:underline">
                    {translate("admin.dapps.title")}
                </Link>
                <ChevronRightIcon size={14} />
                <span aria-current="page" className="min-w-0 font-medium text-ink wrap-anywhere">
                    {dapp.name}
                </span>
            </nav>

            <div className="flex flex-wrap items-center gap-4">
                <span
                    className="flex size-12 flex-none items-center justify-center rounded-[12px] bg-ok-bg text-[18px] font-bold text-ok-ink"
                    aria-hidden="true"
                >
                    {initials(dapp.name)}
                </span>
                <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <PageTitle ref={heading} tabIndex={-1} size="medium">
                            {dapp.name}
                        </PageTitle>
                        <span className="inline-flex flex-wrap gap-2">
                            <StatusBadge status={dapp.status} />
                            {dapp.pendingChange && <StatusBadge status="changeUnderReview" />}
                        </span>
                    </div>
                    <span className="text-sm text-ink-subtle wrap-anywhere">
                        {translate("admin.dapp.submitted", { date: formatDateTime(dapp.createdAt) })} {dapp.ownerEmail}
                    </span>
                </div>
                {dapp.status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setAction("approve")}>
                            <CheckIcon size={16} />
                            {translate("admin.dapp.approve")}
                        </Button>
                        <Button variant="danger" onClick={() => setAction("reject")}>
                            {translate("admin.dapp.reject")}
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-start gap-6">
                <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
                    {dapp.status === "approved" && dapp.pendingChange && (
                        <ChangeReview
                            dapp={dapp}
                            change={dapp.pendingChange}
                            onApprove={() => setAction("approveChange")}
                            onReject={() => setAction("rejectChange")}
                        />
                    )}
                    <DappFacts dapp={dapp} />
                </div>

                <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
                    <DappRecord dapp={dapp} />
                </aside>
            </div>

            <ConfirmDialog
                open={action === "approve"}
                onClose={close}
                title={translate("admin.dapp.approveDialog.title", { name: dapp.name })}
                description={translate("admin.dapp.approveDialog.description")}
                icon={<CheckCircleIcon size={20} />}
                confirmLabel={translate("admin.dapp.approveDialog.confirm")}
                loading={loading}
                onConfirm={() => mutations.approve.mutate(dapp.id, settle)}
            >
                <dl className="m-0 grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-[12px] border border-border bg-canvas px-4 py-[14px] text-sm [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:wrap-anywhere [&_dt]:font-mono [&_dt]:text-2xs [&_dt]:leading-[19.5px] [&_dt]:font-medium [&_dt]:tracking-kicker [&_dt]:text-ink-subtle [&_dt]:uppercase">
                    <dt>{translate("admin.dapp.approveDialog.application")}</dt>
                    <dd className="font-medium">{dapp.name}</dd>
                    <dt>{translate("dapp.fields.callbackUrls")}</dt>
                    <dd>{dapp.callbackUrls.length}</dd>
                    <dt>{translate("dapp.fields.webOrigins")}</dt>
                    <dd>{dapp.webOrigins.length}</dd>
                    <dt>{translate("dapp.fields.logoutUrls")}</dt>
                    <dd>{dapp.logoutUrls.length}</dd>
                    <dt>{translate("dapp.fields.mauBracket")}</dt>
                    <dd>{translate(`dapp.mau.${dapp.mauBracket}`)}</dd>
                </dl>
                <p className={DIALOG_NOTE}>{translate("admin.dapp.approveDialog.note")}</p>
                {failure}
            </ConfirmDialog>
            <ConfirmDialog
                open={action === "reject"}
                onClose={close}
                title={translate("admin.dapp.rejectDialog.title", { name: dapp.name })}
                description={translate("admin.dapp.rejectDialog.description")}
                icon={<XCircleIcon size={20} />}
                confirmLabel={translate("admin.dapp.rejectDialog.confirm")}
                destructive
                loading={loading}
                onConfirm={() => mutations.reject.mutate(dapp.id, settle)}
            >
                {failure}
            </ConfirmDialog>
            <ConfirmDialog
                open={action === "approveChange"}
                onClose={close}
                title={translate("admin.dapp.approveChangeDialog.title")}
                description={translate("admin.dapp.approveChangeDialog.description")}
                icon={<CheckCircleIcon size={20} />}
                confirmLabel={translate("admin.dapp.approveChangeDialog.confirm")}
                loading={loading}
                onConfirm={() => mutations.approveChange.mutate(dapp.id, settle)}
            >
                {failure}
            </ConfirmDialog>
            <ConfirmDialog
                open={action === "rejectChange"}
                onClose={close}
                title={translate("admin.dapp.rejectChangeDialog.title")}
                description={translate("admin.dapp.rejectChangeDialog.description")}
                icon={<XCircleIcon size={20} />}
                confirmLabel={translate("admin.dapp.rejectChangeDialog.confirm")}
                destructive
                loading={loading}
                onConfirm={() => mutations.rejectChange.mutate(dapp.id, settle)}
            >
                {failure}
            </ConfirmDialog>
        </>
    );
}
