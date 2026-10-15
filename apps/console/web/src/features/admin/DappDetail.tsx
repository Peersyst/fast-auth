import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ApiError, type AdminDapp, type ErrorCode } from "../../api/client";
import { errorMessage } from "../../api/error-message";
import { useAdminAction, useAdminDapp, useAdminEditDapp } from "../../api/hooks";
import { LoadError, RefreshError } from "../../app/LoadError";
import { LoadingScreen } from "../../app/LoadingScreen";
import { transition, type DappAction } from "../../../../src/domain/dapp-transitions";
import { isContactEmail, REASON_MAX_LENGTH, REASON_MIN_LENGTH } from "../../../../src/domain/field-rules";
import { diffSyncedFields, MAU_LABELS, type FieldValueChange } from "../../lib/dapp-fields";
import { FIELD_REASONS } from "../../lib/dapp-schema";
import { formatDateTime, shortClientId } from "../../lib/format";
import { initials } from "../../lib/initials";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { ConfirmDialog, Dialog, DialogForm } from "../../ui/Dialog";
import { Field } from "../../ui/Field";
import { CheckCircleIcon, CheckIcon, ChevronRightIcon, PencilIcon, TrashIcon, UserPenIcon, WarningIcon, XCircleIcon } from "../../ui/icons";
import { ChangeDiff } from "../dapp/ChangeDiff";
import { DappForm } from "../dapp/DappForm";
import { StatusBadge } from "../dapp/StatusBadge";
import { useHeadingFocus } from "../dapp/useHeadingFocus";
import valueStyles from "../dapp/values.module.css";
import { ActivityLog } from "./ActivityLog";
import styles from "./admin.module.css";
import { ChangeReview } from "./ChangeReview";
import { DappFacts, DappRecord } from "./DappFacts";
import { EmailText } from "./Email";

const AUTH0_ERROR_TITLE = "The last Auth0 call failed";

const ADMIN_WORDING: Partial<Record<ErrorCode, string>> = {
    PROVISIONING_REJECTED: `Auth0, or the console's check of the client's tag, refused this, so the console saved nothing. Its error is shown under "${AUTH0_ERROR_TITLE}".`,
    PROVISIONING_FAILED: `The console could not finish this in Auth0, so it saved nothing, though Auth0 may already hold part of it. Try again in a few minutes; the error is shown under "${AUTH0_ERROR_TITLE}".`,
};

function adminErrorMessage(error: unknown, wording: Partial<Record<ErrorCode, string>> = {}): string {
    return (error instanceof ApiError && { ...ADMIN_WORDING, ...wording }[error.code]) || errorMessage(error);
}

const REASON = { label: "Reason", minLength: REASON_MIN_LENGTH, maxLength: REASON_MAX_LENGTH };
const REVIEW_REASON = {
    ...REASON,
    placeholder: "What needs to change before this can be approved?",
    hint: "Be specific. This is the only feedback they get.",
};

function useListPath(): string {
    const state: unknown = useLocation().state;
    const search = typeof state === "object" && state !== null && "listSearch" in state ? state.listSearch : undefined;
    return typeof search === "string" ? `/admin/dapps${search}` : "/admin/dapps";
}

export function DappDetail() {
    const { id = "" } = useParams();
    const dapp = useAdminDapp(id);
    const listPath = useListPath();

    if (dapp.data === undefined) {
        if (!dapp.isError) return <LoadingScreen />;
        if (dapp.error instanceof ApiError && (dapp.error.statusCode === 400 || dapp.error.statusCode === 404)) {
            return (
                <section className={styles.page}>
                    <h1 className={styles.title}>dApp not found</h1>
                    <p>
                        <Link to={listPath} className={styles.link}>
                            Back to the dApps
                        </Link>
                    </p>
                </section>
            );
        }
        return (
            <LoadError
                title="The dApp could not be loaded"
                error={dapp.error}
                onRetry={() => void dapp.refetch()}
                retrying={dapp.isFetching}
            />
        );
    }
    return (
        <div className={styles.page}>
            {dapp.isError && <RefreshError error={dapp.error} />}
            <AdminDappView key={dapp.data.id} dapp={dapp.data} />
        </div>
    );
}

const LEFT_IN_AUTH0 =
    "the console left this Auth0 client in place because it is not tagged as this dApp's. Check in the Auth0 dashboard what uses it before you delete it there by hand.";

const NOTHING_SAVED =
    "The console saved nothing, though Auth0 may hold part of the failed write. Retrying the same action is safe; this clears after the next successful Auth0 write.";

const AUTH0_ERROR_OUTCOMES: Record<AdminDapp["status"], string> = {
    pending: NOTHING_SAVED,
    approved: NOTHING_SAVED,
    rejected: `If this came from the rejection, the rejection went through and ${LEFT_IN_AUTH0} If it came from a removal, the console saved nothing and retrying it is safe.`,
    removed: `The removal went through, but ${LEFT_IN_AUTH0}`,
};

type Action = { kind: "approve" | "reject" | "approveChange" | "rejectChange" | "owner" | "remove"; version: number };

function AdminDappView({ dapp }: { dapp: AdminDapp }) {
    const [editing, setEditing] = useState<AdminDapp | null>(null);
    const [action, setAction] = useState<Action | null>(null);
    const [changed, setChanged] = useState(false);
    const [liveSave, setLiveSave] = useState<{ changes: FieldValueChange[]; decide: (apply: boolean) => void } | null>(null);
    const edit = useAdminEditDapp(dapp.id);
    const run = useAdminAction(dapp.id);
    const can = (action: DappAction) => transition({ status: dapp.status, hasPendingChange: dapp.pendingChange !== null }, action).ok;
    const active = dapp.status !== "removed";
    const { heading, focusHeadingAfterRender } = useHeadingFocus(false);
    const listPath = useListPath();

    const switchEditing = (next: AdminDapp | null) => {
        focusHeadingAfterRender();
        setEditing(next);
    };

    const confirmLiveSave = (changes: FieldValueChange[]) => new Promise<boolean>((decide) => setLiveSave({ changes, decide }));
    const decideLiveSave = (apply: boolean) => {
        liveSave?.decide(apply);
        setLiveSave(null);
    };
    const open = (kind: Action["kind"]) => {
        setChanged(false);
        setAction({ kind, version: dapp.version });
    };
    const close = () => {
        setAction(null);
        run.reset();
    };
    const settle = {
        onSuccess: () => {
            close();
            focusHeadingAfterRender();
        },
        onError: (error: Error) => {
            if (!(error instanceof ApiError && error.code === "DAPP_CHANGED")) return;
            close();
            focusHeadingAfterRender();
            setChanged(true);
        },
    };
    const failure = (error: unknown, wording?: Partial<Record<ErrorCode, string>>) =>
        error ? (
            <Callout tone="error" title="Not done">
                <p>{adminErrorMessage(error, wording)}</p>
            </Callout>
        ) : null;

    return (
        <>
            <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
                <Link to={listPath}>dApps</Link>
                <ChevronRightIcon size={14} />
                <span aria-current="page">{dapp.name}</span>
            </nav>

            <div className={styles.detailHead}>
                <span className={styles.headMark} aria-hidden="true">
                    {initials(dapp.name)}
                </span>
                <div className={styles.headText}>
                    <div className={styles.headTitle}>
                        <h1 ref={heading} tabIndex={-1} className={styles.title}>
                            {dapp.name}
                        </h1>
                        <span className={styles.badges}>
                            <StatusBadge status={dapp.status} />
                            {dapp.pendingChange && <StatusBadge status="change-under-review" />}
                        </span>
                    </div>
                    <span className={styles.headMeta}>
                        Submitted {formatDateTime(dapp.submittedAt)} · owned by <EmailText email={dapp.ownerEmail} />
                    </span>
                </div>
                {active && !editing && (
                    <div className={styles.headActions}>
                        {can("approve") && (
                            <Button onClick={() => open("approve")}>
                                <CheckIcon size={16} />
                                Approve
                            </Button>
                        )}
                        {can("reject") && (
                            <Button variant="danger" onClick={() => open("reject")}>
                                Reject
                            </Button>
                        )}
                        <Button variant="secondary" disabled={!can("adminEdit")} onClick={() => switchEditing(dapp)}>
                            <PencilIcon size={15} />
                            Edit
                        </Button>
                    </div>
                )}
            </div>
            {active && !editing && !can("adminEdit") && <p className={styles.hint}>Approve or reject the pending change before editing.</p>}

            {changed && (
                <div role="alert">
                    <Callout tone="warning" title="Nothing was done">
                        <p>This dApp changed since you opened that dialog. Review its latest version below, then decide again.</p>
                    </Callout>
                </div>
            )}
            {dapp.auth0Error && (
                <Callout tone="error" title={AUTH0_ERROR_TITLE}>
                    <p>
                        <code className={valueStyles.code}>{dapp.auth0Error}</code>
                    </p>
                    <p>{AUTH0_ERROR_OUTCOMES[dapp.status]}</p>
                </Callout>
            )}
            {dapp.status === "rejected" && (
                <Callout tone="warning" title="Rejected">
                    <p className={styles.reason}>{dapp.rejectionReason}</p>
                </Callout>
            )}
            {dapp.status === "removed" && (
                <Callout tone="info" title="Removed">
                    <p>
                        {dapp.removedAt && formatDateTime(dapp.removedAt)}
                        {dapp.removedBy && (
                            <>
                                {" "}
                                by <EmailText email={dapp.removedBy} />
                            </>
                        )}
                        .
                    </p>
                    {dapp.removalReason && <p className={styles.reason}>{dapp.removalReason}</p>}
                </Callout>
            )}

            <div className={styles.columns}>
                <div className={styles.mainColumn}>
                    {dapp.pendingChange && can("approveChange") && (
                        <ChangeReview
                            dapp={dapp}
                            change={dapp.pendingChange}
                            onApprove={() => open("approveChange")}
                            onReject={() => open("rejectChange")}
                        />
                    )}

                    {editing ? (
                        <DappForm
                            key={editing.version}
                            mode="admin"
                            values={editing}
                            saveLabel="Save changes"
                            onSave={async (fields) => {
                                const changes = editing.status === "approved" ? diffSyncedFields(editing, fields) : [];
                                if (changes.length > 0 && !(await confirmLiveSave(changes))) return;
                                await edit.mutateAsync({ ...fields, expectedVersion: editing.version });
                                setChanged(false);
                                switchEditing(null);
                            }}
                            onCancel={() => switchEditing(null)}
                            onReload={() => switchEditing(can("adminEdit") ? dapp : null)}
                            errorText={adminErrorMessage}
                        />
                    ) : (
                        <DappFacts dapp={dapp} onChangeOwner={can("changeOwner") ? () => open("owner") : undefined} />
                    )}

                    <ActivityLog id={dapp.id} />
                </div>

                <aside className={styles.sideColumn}>
                    <DappRecord dapp={dapp} />
                    {can("remove") && !editing && (
                        <section className={`${styles.sideCard} ${styles.dangerCard}`}>
                            <h2>Danger zone</h2>
                            <p>
                                Deletes its Auth0 application, if any; the record and its activity log are kept. You&apos;ll be asked to
                                confirm and give a reason, which is emailed to the owner. The owner can submit again with the same email.
                            </p>
                            <Button variant="danger" size="small" className={styles.dangerAction} onClick={() => open("remove")}>
                                Remove dApp…
                            </Button>
                        </section>
                    )}
                </aside>
            </div>

            <ConfirmDialog
                open={liveSave !== null}
                onClose={() => decideLiveSave(false)}
                title="Apply changes to the live app?"
                description={
                    <>
                        {dapp.name} is approved and live. Saving updates its Auth0 application immediately. A wrong callback URL or origin
                        breaks login for its users until it is fixed. The owner gets an email about the change.
                    </>
                }
                icon={<WarningIcon />}
                tone="warn"
                confirmLabel="Save and apply"
                cancelLabel="Keep editing"
                onConfirm={() => decideLiveSave(true)}
            >
                {liveSave && <ChangeDiff rows={liveSave.changes} beforeLabel="Live" afterLabel="New" />}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "approve"}
                onClose={close}
                title={`Approve ${dapp.name}?`}
                description={
                    <>
                        This creates its Auth0 application and emails the client ID to <strong>{dapp.ownerEmail}</strong>. The dApp can
                        authenticate real users immediately.
                    </>
                }
                icon={<CheckCircleIcon size={20} />}
                confirmLabel="Approve and provision"
                loading={run.isPending}
                onConfirm={() => action && run.mutate({ action: "approve", body: { expectedVersion: action.version } }, settle)}
            >
                <dl className={styles.summary}>
                    <dt>Auth0 application</dt>
                    <dd className={styles.strong}>{dapp.name}</dd>
                    <dt>Callback URLs</dt>
                    <dd>{dapp.callbackUrls.length}</dd>
                    <dt>Web origins</dt>
                    <dd>{dapp.webOrigins.length}</dd>
                    <dt>Logout URLs</dt>
                    <dd>{dapp.logoutUrls.length}</dd>
                    <dt>Expected MAU</dt>
                    <dd>{MAU_LABELS[dapp.mauBracket]}</dd>
                </dl>
                <p className={styles.dialogNote}>
                    Later owner changes to the name, description, logo or URLs come back for review; contact email and MAU changes apply at
                    once. You can remove the dApp at any time.
                </p>
                {failure(run.error)}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "reject"}
                onClose={close}
                title={`Reject ${dapp.name}?`}
                description={
                    <>
                        The reason is shown on their dashboard and emailed to <strong>{dapp.ownerEmail}</strong>. They can fix the issues
                        and resubmit.
                    </>
                }
                icon={<XCircleIcon size={20} />}
                confirmLabel="Reject and notify"
                destructive
                reason={REVIEW_REASON}
                loading={run.isPending}
                onConfirm={(reason) =>
                    action && run.mutate({ action: "reject", body: { expectedVersion: action.version, reason } }, settle)
                }
            >
                {failure(run.error)}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "approveChange"}
                onClose={close}
                title="Approve the change?"
                description={
                    <>
                        This updates the Auth0 application with the proposed values and emails <strong>{dapp.ownerEmail}</strong>.
                    </>
                }
                icon={<CheckCircleIcon size={20} />}
                confirmLabel="Approve change"
                loading={run.isPending}
                onConfirm={() => action && run.mutate({ action: "change/approve", body: { expectedVersion: action.version } }, settle)}
            >
                {failure(run.error)}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "rejectChange"}
                onClose={close}
                title="Reject the change?"
                description={
                    <>
                        The live values stay as they are. The reason is emailed to <strong>{dapp.ownerEmail}</strong>.
                    </>
                }
                icon={<XCircleIcon size={20} />}
                confirmLabel="Reject change"
                destructive
                reason={REVIEW_REASON}
                loading={run.isPending}
                onConfirm={(reason) =>
                    action && run.mutate({ action: "change/reject", body: { expectedVersion: action.version, reason } }, settle)
                }
            >
                {failure(run.error)}
            </ConfirmDialog>
            <ConfirmDialog
                open={action?.kind === "remove"}
                onClose={close}
                title={`Remove ${dapp.name}?`}
                description={
                    <>
                        {dapp.auth0ClientId ? (
                            <>
                                This deletes its Auth0 application. Logins through client ID{" "}
                                <code>{shortClientId(dapp.auth0ClientId)}</code> stop working immediately.
                            </>
                        ) : (
                            "It has no Auth0 application yet, so no logins are affected."
                        )}{" "}
                        It can&apos;t be undone. A new dApp can be submitted afterwards with the same email.
                    </>
                }
                icon={<TrashIcon size={20} />}
                confirmLabel="Remove dApp"
                destructive
                confirmText={dapp.name}
                reason={{ ...REASON, placeholder: "Why is this dApp being removed?" }}
                loading={run.isPending}
                onConfirm={(reason) =>
                    action && run.mutate({ action: "remove", body: { expectedVersion: action.version, reason } }, settle)
                }
            >
                <p className={styles.dialogNote}>
                    The reason is emailed to <strong>{dapp.ownerEmail}</strong>. The record and its activity log are kept.
                </p>
                {failure(run.error)}
            </ConfirmDialog>
            <Dialog
                open={action?.kind === "owner"}
                onClose={close}
                title="Change the owner"
                description={
                    <>
                        The new owner manages {dapp.name} from their own sign-in and receives its emails, and{" "}
                        <strong>{dapp.ownerEmail}</strong> loses access. The Auth0 application stays the same.
                    </>
                }
                icon={<UserPenIcon size={20} />}
                tone="warn"
                busy={run.isPending}
            >
                <ChangeOwnerForm
                    onClose={close}
                    loading={run.isPending}
                    onConfirm={(ownerEmail) =>
                        action && run.mutate({ action: "owner", body: { expectedVersion: action.version, ownerEmail } }, settle)
                    }
                >
                    {failure(run.error, { DAPP_ALREADY_EXISTS: "That email already owns a dApp. Each email can own one." })}
                </ChangeOwnerForm>
            </Dialog>
        </>
    );
}

type ChangeOwnerFormProps = {
    onClose: () => void;
    onConfirm: (ownerEmail: string) => void;
    loading: boolean;
    children: ReactNode;
};

function ChangeOwnerForm({ onClose, onConfirm, loading, children }: ChangeOwnerFormProps) {
    const [email, setEmail] = useState("");
    const [attempted, setAttempted] = useState(false);
    const trimmed = email.trim();
    const valid = isContactEmail(trimmed);

    return (
        <DialogForm
            onClose={onClose}
            confirmLabel="Change owner"
            loading={loading}
            onSubmit={() => {
                setAttempted(true);
                if (valid) onConfirm(trimmed);
            }}
        >
            <Field label="New owner's email" error={attempted && !valid ? FIELD_REASONS.contactEmail : undefined}>
                {(control) => (
                    <input {...control} type="email" value={email} autoComplete="off" onChange={(event) => setEmail(event.target.value)} />
                )}
            </Field>
            {children}
        </DialogForm>
    );
}
