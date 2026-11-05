import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import { Dapp, DappEvent } from "@database/console/entities";
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
import { AdminAlertKind } from "../notification/interfaces/i-emailer.service";
import { SettingService } from "../setting/setting.service";
import { DappLifecycleService, describeError, Effects, refusedOrFailed } from "./dapp-lifecycle.service";
import { DappNotifier } from "./dapp.notifier";
import { DappErrorCode } from "./error/dapp.error-codes";
import { toDappFields, UpdateDappRequest, UpsertDappRequest } from "./requests/upsert-dapp.request";
import { MyDappDto, OwnerDappDto } from "./dtos/owner-dapp.dto";
import { Actor, ownerActor } from "./types/actor";

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
        private readonly lifecycle: DappLifecycleService,
        private readonly settingService: SettingService,
        private readonly notifier: DappNotifier,
        @Inject(ConfigService) private readonly configService: ConfigService,
    ) {}

    /**
     * Finds the caller's dApp that is not removed, matching the email in any case.
     * @param user The caller.
     * @returns The dApp, or null when the caller has none.
     */
    async getOwn(user: SessionUser): Promise<MyDappDto> {
        return MyDappDto.fromEntity(await this.lifecycle.findLiveByOwner(this.dataSource.manager, user.email));
    }

    /**
     * Registers a pending dApp for the caller, auto-approving it if it qualifies, then alerts the admins by email and Slack and, once approved, emails the owner. A failed alert does not fail the submission.
     * @param user The owner.
     * @param request The submitted fields.
     * @returns The approved dApp, or the pending one when it was not auto-approved.
     */
    async submit(user: SessionUser, request: UpsertDappRequest): Promise<OwnerDappDto> {
        return OwnerDappDto.fromEntity(await this.submitDapp(user, toDappFields(request)));
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
        const dapp = await this.lifecycle.counted(DappAction.EDIT, async () => {
            const owner = ownerActor(user);
            const { dapp, alert, before } = await this.lifecycle.mutate(
                DappAction.EDIT,
                owner,
                { id, ownerEmail: user.email },
                request.expectedVersion,
                async (manager, live, next): Promise<EditOutcome> => ({
                    ...(await (live.status === DappStatus.APPROVED
                        ? this.editApproved(manager, live, fields, owner)
                        : this.editInPlace(manager, live, next, fields, owner))),
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
        await this.lifecycle.counted(DappAction.REMOVE, () => {
            const owner = ownerActor(user);
            return this.lifecycle.mutate(DappAction.REMOVE, owner, { id, ownerEmail: user.email }, expectedVersion, (manager, live, next) =>
                this.lifecycle.removeIn(manager, live, next, owner),
            );
        });
    }

    /**
     * Inserts the pending dApp and its submitted event, choosing it for auto-approval when it qualifies, then approves and notifies.
     * @param user The owner.
     * @param fields The submitted fields.
     * @returns The approved dApp, or the pending one.
     */
    private submitDapp(user: SessionUser, fields: DappFields): Promise<Dapp> {
        return this.lifecycle.counted("submit", async () => {
            const submission = this.lifecycle.transaction(async (manager) => {
                // Lock the owner's dApp before the settings row. An admin action can hold that dApp through its Auth0 calls,
                // and waiting for it while holding the settings row would stall every submission and settings change.
                if ((await this.lifecycle.findLiveByOwner(manager, user.email, true)) !== null)
                    throw new BusinessException(DappErrorCode.DAPP_ALREADY_EXISTS);
                const chosen =
                    (await this.settingService.isAutoApprovalEnabled(manager, true)) &&
                    !(await this.hasHadDapp(manager, user.email)) &&
                    (await this.countChosenForAutoApprovalInLastDay(manager)) < this.configService.get<number>("autoApproval.dailyCap")!;
                const { identifiers } = await manager.insert(Dapp, {
                    ...fields,
                    ownerEmail: user.email,
                    status: DappStatus.PENDING,
                    submittedAt: new Date(),
                });
                const dapp = await manager.findOneByOrFail(Dapp, { id: identifiers[0].id });
                await this.lifecycle.appendEvents(manager, dapp.id, ownerActor(user), [
                    { type: DappEventType.SUBMITTED, details: { chosenForAutoApproval: chosen } },
                ]);
                return { dapp, chosen };
            });
            const { dapp, chosen } = await submission.catch((error: unknown) => {
                this.logger.log(`submit by user ${refusedOrFailed(error)}: ${describeError(error)}`);
                throw error;
            });
            this.logger.log(`submit dApp ${dapp.id} by user: -> pending${chosen ? ", chosen for auto-approval" : ""}`);

            const approved = chosen ? await this.lifecycle.autoApprove(dapp) : null;
            if (approved === null) {
                await this.notifier.submitted(dapp);
                return dapp;
            }
            await this.notifier.autoApproved(approved);
            return approved;
        });
    }

    /**
     * Tells whether the email owns or ever owned a dApp. It also checks the events an owner acted on, because an admin can move a dApp to another owner and ownership alone loses that history.
     * @param manager The transaction's entity manager.
     * @param ownerEmail The owner's email.
     * @returns Whether the email has had a dApp.
     */
    private async hasHadDapp(manager: EntityManager, ownerEmail: string): Promise<boolean> {
        const [owned, acted] = await Promise.all([
            manager.existsBy(Dapp, { ownerEmail }),
            manager.existsBy(DappEvent, { actorRole: ActorRole.USER, actorEmail: ownerEmail }),
        ]);
        return owned || acted;
    }

    /**
     * Counts the submissions chosen for auto-approval in the rolling last 24 hours, whether or not their approval succeeded.
     * @param manager The transaction's entity manager.
     * @returns The count.
     */
    private countChosenForAutoApprovalInLastDay(manager: EntityManager): Promise<number> {
        return manager
            .createQueryBuilder(DappEvent, "e")
            .where("e.type = :submitted", { submitted: DappEventType.SUBMITTED })
            .andWhere("e.details @> CAST(:chosen AS jsonb)", { chosen: JSON.stringify({ chosenForAutoApproval: true }) })
            .andWhere("e.createdAt > now() - interval '24 hours'")
            .getCount();
    }

    /**
     * Applies an edit to a pending or rejected dApp's fields, turning a rejected dApp's edit into a resubmission.
     * @param manager The transaction's entity manager.
     * @param live The locked dApp.
     * @param next The status the lifecycle allows.
     * @param fields The new fields.
     * @param owner The owner.
     * @returns The updated dApp and the admin alert to send, if any.
     */
    private async editInPlace(
        manager: EntityManager,
        live: Dapp,
        next: DappStatus,
        fields: DappFields,
        owner: Actor,
    ): Promise<Omit<EditOutcome, "before">> {
        const changes = diffFields(DAPP_FIELDS, live, fields);
        const resubmitted = live.status === DappStatus.REJECTED;
        const dapp = await this.lifecycle.update(manager, live.id, {
            ...fields,
            status: next,
            ...(resubmitted && { rejectionReason: null, reviewedAt: null, reviewedBy: null, auth0Error: null, submittedAt: new Date() }),
        });
        const events: DappEventDetails[] = changes.length > 0 ? [{ type: DappEventType.EDITED, details: { changes } }] : [];
        if (resubmitted) events.push({ type: DappEventType.RESUBMITTED, details: {} });
        await this.lifecycle.appendEvents(manager, live.id, owner, events);
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
    private async editApproved(manager: EntityManager, live: Dapp, fields: DappFields, owner: Actor): Promise<Omit<EditOutcome, "before">> {
        const { directChanges, pendingChange } = classifyEdit(live, live.pendingChange, fields);
        const effects = pendingChangeEffects(pendingChange, new Date());
        const dapp = await this.lifecycle.update(manager, live.id, { ...effects.columns, ...directFieldsOf(fields) });
        const events = [...effects.events];
        if (directChanges.length > 0) events.push({ type: DappEventType.EDITED, details: { changes: directChanges } });
        await this.lifecycle.appendEvents(manager, live.id, owner, events);
        return { dapp, alert: pendingChange.kind === "replaced" ? DappEventType.CHANGE_REQUESTED : null };
    }
}
