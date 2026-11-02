import { useEffect, useRef, useState, type ReactNode } from "react";
import { syncedFieldsOf } from "@shared/console-domain/dapp";
import { ApiError, type OwnerDapp } from "../../api/client";
import { errorMessage } from "../../api/error-message";
import { useMyDapp, useNearNetwork, useRemoveDapp, useSubmitDapp, useUpdateDapp } from "../../api/hooks";
import { LoadError, RefreshError } from "../../app/LoadError";
import { LoadingScreen } from "../../app/LoadingScreen";
import { shortClientId } from "../../lib/format";
import { APPLY_DOCS_URL, SUPPORT_URL } from "../../lib/links";
import { NEAR_NETWORKS } from "../../lib/near-network";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { ConfirmDialog } from "../../ui/Dialog";
import { BackIcon, GridIcon, PlusIcon } from "../../ui/icons";
import { useSession } from "../auth/session";
import { DappForm } from "../dapp/DappForm";
import { StatusBadge } from "../dapp/StatusBadge";
import { useHeadingFocus } from "../dapp/useHeadingFocus";
import { myDappClasses } from "./classes";
import { ChangeUnderReview, Credentials, PendingStatus, RejectedStatus } from "./DappStatus";
import { DappSummary } from "./DappSummary";

const CONTAINER = "mx-auto my-0 flex w-full max-w-[848px] flex-col gap-6";
const KICKER = "font-mono text-xs font-medium tracking-kicker text-ink-subtle uppercase";
const HEADING = "flex flex-col gap-2";
const TITLE = "text-[40px] leading-[1.05] font-bold tracking-[-0.025em] wrap-anywhere focus:outline-none";
const INLINE_CODE_CHIP = "rounded-[4px] bg-surface-muted px-1.5 py-px font-mono text-[14px]";

export function MyDappPage() {
    const dapp = useMyDapp();
    const live = dapp.data === undefined ? undefined : dapp.data !== null && isLive(dapp.data);
    const wasLive = useRef<boolean>(undefined);
    const replaced = wasLive.current !== undefined && live !== wasLive.current;
    useEffect(() => {
        if (live !== undefined) wasLive.current = live;
    });

    if (dapp.data === undefined) {
        if (!dapp.isError) return <LoadingScreen />;
        return (
            <LoadError
                title="Your dApp could not be loaded"
                error={dapp.error}
                onRetry={() => void dapp.refetch()}
                retrying={dapp.isFetching}
            />
        );
    }
    return (
        <div className="flex min-h-full flex-col gap-10 pb-20 text-md leading-[1.5] text-ink">
            {dapp.isError && (
                <div className={CONTAINER}>
                    <RefreshError error={dapp.error} />
                </div>
            )}
            {dapp.data && isLive(dapp.data) ? <DappView dapp={dapp.data} focusTitle={replaced} /> : <NewDapp focusHeading={replaced} />}
        </div>
    );
}

function NewDapp({ focusHeading }: { focusHeading: boolean }) {
    const [view, setView] = useState<"card" | "form" | "card-again">("card");
    if (view === "form") return <RegisterDapp onCancel={() => setView("card-again")} />;
    return <NoDapp focus={view === "card-again" ? "register" : focusHeading ? "heading" : undefined} onRegister={() => setView("form")} />;
}

function NoDapp({ focus, onRegister }: { focus: "heading" | "register" | undefined; onRegister: () => void }) {
    const { email } = useSession();
    const network = useNearNetwork();
    const heading = useRef<HTMLHeadingElement>(null);
    const register = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (focus === "heading") heading.current?.focus();
        if (focus === "register") register.current?.focus();
    }, [focus]);

    return (
        <div className="flex flex-auto flex-col items-center justify-center gap-4">
            <section className={`flex w-full max-w-[520px] flex-col items-center gap-6 px-10 py-12 text-center ${myDappClasses.card}`}>
                <span className="flex size-14 items-center justify-center rounded-lg border border-dashed border-border-strong bg-canvas text-ink-subtle">
                    <GridIcon />
                </span>
                <div className="flex flex-col items-center gap-2 [&_h1]:text-[30px] [&_h1]:leading-[1.05] [&_h1]:font-bold [&_h1]:tracking-[-0.025em] [&_h1:focus]:outline-none">
                    <p className={KICKER}>{NEAR_NETWORKS[network].name} access</p>
                    <h1 ref={heading} tabIndex={-1}>
                        You haven&apos;t registered a dApp yet
                    </h1>
                    <p className="max-w-[42ch] text-ink-subtle wrap-anywhere">
                        Register your dApp to get a dedicated Auth0 <code className={INLINE_CODE_CHIP}>clientId</code> and access to the{" "}
                        {network} NEAR Auth contract. Each email address can have one dApp at a time, and yours is <strong>{email}</strong>.
                    </p>
                </div>
                <Button ref={register} className="h-[52px] px-6 py-0" onClick={onRegister}>
                    <PlusIcon size={18} />
                    Register your dApp
                </Button>
                <a className={`${KICKER} no-underline`} href={APPLY_DOCS_URL}>
                    How approval works
                </a>
            </section>
            <p className="m-0 max-w-[520px] text-center text-sm leading-[1.5] text-ink-subtle [&_a]:text-link">
                Already approved through the earlier application form? That client keeps working but isn&apos;t managed here.{" "}
                <a href={SUPPORT_URL}>Contact the NEAR Auth team</a> to change it.
            </p>
        </div>
    );
}

function RegisterDapp({ onCancel }: { onCancel: () => void }) {
    const submit = useSubmitDapp();
    const network = useNearNetwork();
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => heading.current?.focus(), []);

    return (
        <>
            <div className={CONTAINER}>
                <div className={HEADING}>
                    <p className={KICKER}>{NEAR_NETWORKS[network].name} access</p>
                    <h1 ref={heading} tabIndex={-1} className={TITLE}>
                        Register your dApp
                    </h1>
                    <p className="text-[16px] text-ink-subtle">
                        Tell us about your app. Once approved you get a dedicated Auth0 <code className={INLINE_CODE_CHIP}>clientId</code>{" "}
                        and access to the {network} NEAR Auth contract.
                    </p>
                </div>
                <Callout tone="info">
                    <p>
                        The name, description, logo and URLs become your Auth0 application&apos;s settings. You can change any field later.
                        See <a href={APPLY_DOCS_URL}>how the approval process works</a>.
                    </p>
                </Callout>
            </div>
            <div className={CONTAINER}>
                <DappForm
                    mode="owner"
                    values={null}
                    saveLabel="Submit for review"
                    saveHint="You'll get an email when it's reviewed."
                    onSave={async (fields) => {
                        await submit.mutateAsync(fields);
                    }}
                    onCancel={onCancel}
                />
            </div>
        </>
    );
}

type Dialog = { kind: "remove" | "withdraw"; version: number };

type LiveDapp = OwnerDapp & { status: Exclude<OwnerDapp["status"], "removed"> };

function isLive(dapp: OwnerDapp): dapp is LiveDapp {
    return dapp.status !== "removed";
}

const APPROVAL_RULE =
    "Changes to the contact email and monthly active users apply at once. Changes to the name, description, logo or URLs go live " +
    "once the NEAR Auth team approves them.";

const EDIT_COPY: Record<LiveDapp["status"], { note: string; saveLabel: string; saveHint?: string }> = {
    pending: {
        note: "Your dApp is still in review. Saved edits keep it in the queue, so you don't need to resubmit.",
        saveLabel: "Save changes",
    },
    rejected: {
        note: "Fix what the review flagged, then resubmit.",
        saveLabel: "Resubmit for review",
        saveHint: "Resubmitting puts the dApp back in the review queue.",
    },
    approved: {
        note: `Your dApp is live. ${APPROVAL_RULE}`,
        saveLabel: "Save changes",
    },
};

function DappView({ dapp, focusTitle }: { dapp: LiveDapp; focusTitle: boolean }) {
    const { email } = useSession();
    const [editing, setEditing] = useState<OwnerDapp | null>(null);
    const [dialog, setDialog] = useState<Dialog | null>(null);
    const [changed, setChanged] = useState(false);
    const update = useUpdateDapp(dapp.id);
    const withdraw = useUpdateDapp(dapp.id);
    const remove = useRemoveDapp(dapp.id);
    const copy = EDIT_COPY[dapp.status];
    const { heading, focusHeadingAfterRender } = useHeadingFocus(focusTitle);

    const switchView = (next: OwnerDapp | null) => {
        focusHeadingAfterRender();
        setEditing(next);
    };
    const openDialog = (kind: Dialog["kind"]) => {
        setChanged(false);
        setDialog({ kind, version: dapp.version });
    };
    const closeDialog = () => {
        setDialog(null);
        withdraw.reset();
        remove.reset();
    };
    const settle = {
        onSuccess: () => {
            closeDialog();
            switchView(null);
        },
        onError: (error: Error) => {
            if (!(error instanceof ApiError && error.code === "DAPP_CHANGED")) return;
            closeDialog();
            switchView(null);
            setChanged(true);
        },
    };

    const title = (
        <div className="flex flex-wrap items-center gap-3">
            <h1 ref={heading} tabIndex={-1} className={TITLE}>
                {dapp.name}
            </h1>
            <StatusBadge status={dapp.status} />
            {dapp.pendingChange && <StatusBadge status="change-under-review" />}
        </div>
    );
    const changedNotice = changed && (
        <div role="alert">
            <Callout tone="warning" title="Nothing was done">
                <p>Your dApp changed since you opened that dialog. Check its latest version below, then try again.</p>
            </Callout>
        </div>
    );
    const changeUnderReview = dapp.pendingChange && (
        <ChangeUnderReview live={dapp} change={dapp.pendingChange} onWithdraw={() => openDialog("withdraw")} />
    );

    let content: ReactNode;
    if (editing) {
        content = (
            <>
                <div className={CONTAINER}>
                    <button
                        type="button"
                        className={`${KICKER} inline-flex cursor-pointer items-center gap-1.5 self-start border-0 p-0 no-underline bg-transparent`}
                        onClick={() => switchView(null)}
                    >
                        <BackIcon />
                        Back to My dApp
                    </button>
                    <div className={HEADING}>
                        <p className={KICKER}>Edit details</p>
                        {title}
                    </div>
                    <Callout tone="info" className="bg-surface">
                        <p>{copy.note}</p>
                    </Callout>
                    {changeUnderReview}
                </div>
                <div className={CONTAINER}>
                    <DappForm
                        key={editing.version}
                        mode="owner"
                        values={editing}
                        saveLabel={copy.saveLabel}
                        saveHint={copy.saveHint}
                        onSave={async (fields) => {
                            await update.mutateAsync({ ...fields, expectedVersion: editing.version });
                            switchView(null);
                        }}
                        onCancel={() => switchView(null)}
                        onReload={() => switchView(dapp)}
                        onRemove={() => openDialog("remove")}
                    />
                </div>
            </>
        );
    } else {
        content = (
            <div className={CONTAINER}>
                {title}
                {changedNotice}
                {dapp.status === "pending" && <PendingStatus submittedAt={dapp.submittedAt} email={email} />}
                {dapp.status === "rejected" && <RejectedStatus reason={dapp.rejectionReason} />}
                {changeUnderReview}
                {dapp.status === "approved" && dapp.auth0ClientId && <Credentials clientId={dapp.auth0ClientId} />}
                {dapp.status === "approved" && (
                    <div className="flex flex-col gap-1 pt-4 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&_p]:text-[14px] [&_p]:text-ink-subtle">
                        <h2>Application settings</h2>
                        <p>{APPROVAL_RULE}</p>
                    </div>
                )}
                <DappSummary
                    dapp={dapp}
                    onEdit={() => {
                        setChanged(false);
                        switchView(dapp);
                    }}
                />
            </div>
        );
    }

    return (
        <>
            {content}

            <ConfirmDialog
                open={dialog?.kind === "withdraw"}
                onClose={closeDialog}
                title="Withdraw the change?"
                confirmLabel="Withdraw change"
                destructive
                loading={withdraw.isPending}
                description="The NEAR Auth team will not review it, and your live settings stay as they are."
                onConfirm={() =>
                    dialog &&
                    withdraw.mutate(
                        {
                            ...syncedFieldsOf(dapp),
                            contactEmail: dapp.contactEmail,
                            mauBracket: dapp.mauBracket,
                            expectedVersion: dialog.version,
                        },
                        settle,
                    )
                }
            >
                {withdraw.isError && (
                    <Callout tone="error" title="Not withdrawn">
                        <p>{errorMessage(withdraw.error)}</p>
                    </Callout>
                )}
            </ConfirmDialog>
            <ConfirmDialog
                open={dialog?.kind === "remove"}
                onClose={closeDialog}
                title={`Remove ${dapp.name}?`}
                confirmLabel="Remove dApp"
                destructive
                confirmText={dapp.name}
                loading={remove.isPending}
                description={
                    <>
                        {dapp.status === "approved" && dapp.auth0ClientId ? (
                            <>
                                This deletes the dApp and its Auth0 application. Logins through client ID{" "}
                                <code>{shortClientId(dapp.auth0ClientId)}</code> stop working immediately.
                            </>
                        ) : (
                            <>This deletes the dApp{dapp.status === "pending" && " and takes it out of the review queue"}.</>
                        )}{" "}
                        It can&apos;t be undone. A new dApp can be submitted afterwards with the same email.
                    </>
                }
                onConfirm={() => dialog && remove.mutate(dialog.version, settle)}
            >
                {remove.isError && (
                    <Callout tone="error" title="Not removed">
                        <p>{errorMessage(remove.error)}</p>
                    </Callout>
                )}
            </ConfirmDialog>
        </>
    );
}
