import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import { Dapp } from "@database/console/entities";
import {
    ActorRole,
    classifyEdit,
    DAPP_FIELDS,
    DappAction,
    DappEventDetails,
    DappEventType,
    DappFields,
    DappStatus,
    diffFields,
    directFieldsOf,
    PendingChangeOutcome,
} from "@shared/modules/dapp";
import { SessionUser } from "../auth/types/session-user";
import { BusinessException } from "../common/exception/business.exception";
import { AdminAlertKind } from "../notification/interfaces/i-slack-notifier.service";
import { SettingService } from "../setting/setting.service";
import { DappWriteService, describeError, Effects, refusedOrFailed } from "./dapp-write.service";
import { DappNotifier } from "./dapp.notifier";
import { DappErrorCode } from "./error/dapp.error-codes";
import { toDappFields, UpdateDappRequest, UpsertDappRequest } from "./requests/upsert-dapp.request";
import { MyDappDto, OwnerDappDto } from "./dtos/owner-dapp.dto";

type EditOutcome = { dapp: Dapp; alert: AdminAlertKind | null; before: Dapp };

/**
 * Gives the columns and events that apply an edit's outcome to the pending change.
 * @param outcome What the edit does to the pending change.
 * @param now The time to record as the change's request time.
 * @returns The columns and events.
 */
function pendingChangeEffects(outcome: PendingChangeOutcome, now: Date): Effects {
    switch (outcome.kind) {
        case "unchanged":
            return { columns: {}, events: [] };
        case "withdrawn":
            return {
                columns: { pendingChange: null, pendingChangeAt: null },
                events: [{ type: DappEventType.CHANGE_WITHDRAWN, details: {} }],
            };
        case "replaced":
            return {
                columns: { pendingChange: outcome.change, pendingChangeAt: now },
                events: [{ type: DappEventType.CHANGE_REQUESTED, details: { changes: outcome.changes } }],
            };
    }
}

@Injectable()
export class DappService {
    private readonly logger = new Logger(DappService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly writes: DappWriteService,
        private readonly settingService: SettingService,
        private readonly notifier: DappNotifier,
    ) {}

    /**
     * Finds the caller's dApp that is not removed, matching the email in any case.
     * @param user The caller.
     * @returns The dApp, or null when the caller has none.
     */
    async getOwn(user: SessionUser): Promise<MyDappDto> {
        return MyDappDto.fromEntity(await this.writes.findLiveByOwner(this.dataSource.manager, user.email));
    }

    /**
     * Registers a pending dApp for the caller, auto-approving it if it qualifies, then alerts the admins on Slack. A failed alert does not fail the submission.
     * @param user The owner.
     * @param request The submitted fields.
     * @returns The approved dApp, or the pending one when it was not auto-approved.
     */
    async submit(user: SessionUser, request: UpsertDappRequest): Promise<OwnerDappDto> {
        const fields = toDappFields(request);
        const dapp = await this.writes.counted("submit", async () => {
            const { dapp, chosen } = await this.writes
                .transaction(async (manager) => {
                    if ((await this.writes.findLiveByOwner(manager, user.email, true)) !== null)
                        throw new BusinessException(DappErrorCode.DAPP_ALREADY_EXISTS);
                    // Auto-approval is a first-dApp pass: an email that ever had a dApp, removed ones included, goes to review.
                    const chosen =
                        this.settingService.isAutoApprovalEnabled() && !(await manager.existsBy(Dapp, { ownerEmail: user.email }));
                    const { identifiers } = await manager.insert(Dapp, {
                        ...fields,
                        ownerEmail: user.email,
                        status: DappStatus.PENDING,
                        submittedAt: new Date(),
                    });
                    const dapp = await manager.findOneByOrFail(Dapp, { id: identifiers[0].id });
                    await this.writes.appendEvents(manager, dapp.id, ActorRole.USER, [
                        { type: DappEventType.SUBMITTED, details: { chosenForAutoApproval: chosen } },
                    ]);
                    return { dapp, chosen };
                })
                .catch((error: unknown) => {
                    this.logger.log(`submit by user ${refusedOrFailed(error)}: ${describeError(error)}`);
                    throw error;
                });
            this.logger.log(`submit dApp ${dapp.id} by user: -> pending${chosen ? ", chosen for auto-approval" : ""}`);

            const approved = chosen ? await this.writes.autoApprove(dapp) : null;
            if (approved !== null) {
                await this.notifier.autoApproved(approved);
                return approved;
            }
            await this.notifier.submitted(dapp);
            return dapp;
        });
        return OwnerDappDto.fromEntity(dapp);
    }

    /**
     * Edits the caller's live dApp at the expected version. A pending one changes in place, a rejected one is resubmitted, and an approved one applies direct fields at once and requests a change for synced fields. Resubmissions and change requests alert the admins.
     * @param user The owner.
     * @param id The dApp id the caller named.
     * @param request The new fields and the version the caller last read.
     * @returns The updated dApp.
     */
    async editOwn(user: SessionUser, id: string, request: UpdateDappRequest): Promise<OwnerDappDto> {
        const fields = toDappFields(request);
        const dapp = await this.writes.counted(DappAction.EDIT, async () => {
            const owner = ActorRole.USER;
            const { dapp, alert, before } = await this.writes.mutate(
                DappAction.EDIT,
                owner,
                { id, ownerEmail: user.email },
                request.expectedVersion,
                async (manager, live): Promise<EditOutcome> => ({
                    ...(await (live.status === DappStatus.APPROVED
                        ? this.editApproved(manager, live, fields, owner)
                        : this.editInPlace(manager, live, fields, owner))),
                    before: live,
                }),
            );
            if (alert === DappEventType.CHANGE_REQUESTED) await this.notifier.changeRequested(dapp);
            if (alert === DappEventType.RESUBMITTED) await this.notifier.resubmitted(dapp, before);
            return dapp;
        });
        return OwnerDappDto.fromEntity(dapp);
    }

    /**
     * Removes the caller's live dApp at the expected version, deleting its Auth0 client.
     * @param user The owner.
     * @param id The dApp id the caller named.
     * @param expectedVersion The version the caller last read.
     */
    async removeOwn(user: SessionUser, id: string, expectedVersion: number): Promise<void> {
        await this.writes.counted(DappAction.REMOVE, () => {
            const owner = ActorRole.USER;
            return this.writes.mutate(DappAction.REMOVE, owner, { id, ownerEmail: user.email }, expectedVersion, (manager, live) =>
                this.writes.removeIn(manager, live, owner),
            );
        });
    }

    /**
     * Applies an edit to a pending or rejected dApp's fields, turning a rejected dApp's edit into a resubmission.
     * @param manager The transaction's entity manager.
     * @param live The locked dApp.
     * @param fields The new fields.
     * @param owner The owner.
     * @returns The updated dApp and the admin alert to send, if any.
     */
    private async editInPlace(
        manager: EntityManager,
        live: Dapp,
        fields: DappFields,
        owner: ActorRole,
    ): Promise<Omit<EditOutcome, "before">> {
        const changes = diffFields(DAPP_FIELDS, live, fields);
        const resubmitted = live.status === DappStatus.REJECTED;
        const dapp = await this.writes.update(manager, live.id, {
            ...fields,
            status: DappStatus.PENDING,
            ...(resubmitted && { reviewedAt: null, auth0Error: null, submittedAt: new Date() }),
        });
        const events: DappEventDetails[] = changes.length > 0 ? [{ type: DappEventType.EDITED, details: { changes } }] : [];
        if (resubmitted) events.push({ type: DappEventType.RESUBMITTED, details: {} });
        await this.writes.appendEvents(manager, live.id, owner, events);
        return { dapp, alert: resubmitted ? DappEventType.RESUBMITTED : null };
    }

    /**
     * Applies an approved dApp's direct fields at once and turns its synced fields into a pending change for review.
     * @param manager The transaction's entity manager.
     * @param live The locked dApp.
     * @param fields The new fields.
     * @param owner The owner.
     * @returns The updated dApp and the admin alert to send, if any.
     */
    private async editApproved(
        manager: EntityManager,
        live: Dapp,
        fields: DappFields,
        owner: ActorRole,
    ): Promise<Omit<EditOutcome, "before">> {
        const { directChanges, pendingChange } = classifyEdit(live, live.pendingChange, fields);
        const effects = pendingChangeEffects(pendingChange, new Date());
        const dapp = await this.writes.update(manager, live.id, { ...effects.columns, ...directFieldsOf(fields) });
        const events = [...effects.events];
        if (directChanges.length > 0) events.push({ type: DappEventType.EDITED, details: { changes: directChanges } });
        await this.writes.appendEvents(manager, live.id, owner, events);
        return { dapp, alert: pendingChange.kind === "replaced" ? DappEventType.CHANGE_REQUESTED : null };
    }
}
