import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager, FindOptionsWhere, ILike, Not, QueryFailedError } from "typeorm";
import { Dapp, OWNER_EMAIL_LIVE_INDEX } from "@database/console/entities";
import { DappStatus } from "@shared/modules/dapp";
import { OrderType } from "@shared/utils";
import { Role, SessionUser } from "../auth/types/session-user";
import { BusinessException } from "../common/exception/business.exception";
import { AdminAlertKind, SlackAlert } from "../notification/interfaces/i-slack-notifier.service";
import type { ISlackNotifierService } from "../notification/interfaces/i-slack-notifier.service";
import { SLACK_NOTIFIER } from "../notification/notification.tokens";
import { DappClient, ProvisioningError } from "../provisioning/interfaces/i-auth0-provisioner.service";
import type { IAuth0ProvisionerService } from "../provisioning/interfaces/i-auth0-provisioner.service";
import { AUTH0_PROVISIONER } from "../provisioning/provisioning.tokens";
import { DappMetricsProvider, TransitionAction } from "./dapp.metrics";
import { DappErrorCode } from "./error/dapp.error-codes";
import { CreateDappRequest } from "./requests/create-dapp.request";
import { DEFAULT_PAGE_SIZE, ListDappsRequest } from "./requests/list-dapps.request";
import { DappDto } from "./dtos/dapp.dto";
import { PaginatedDappsDto } from "./dtos/paginated-dapps.dto";

/** What a write left behind: the dApp, and the alert to send once the transaction commits. */
type Outcome = { dapp: Dapp; alert: SlackAlert | null };

/**
 * Maps the database errors a dApp write can expect, a second live dApp for one email or a row lock timeout, to their business error.
 * @param error The thrown value.
 * @returns The business error, or the thrown value for any other error.
 */
function fromPostgresError(error: unknown): unknown {
    if (!(error instanceof QueryFailedError)) return error;
    const { code, constraint } = error.driverError as { code?: string; constraint?: string };
    // 23505 is unique_violation, 55P03 is lock_not_available.
    if (code === "23505" && constraint === OWNER_EMAIL_LIVE_INDEX) return new BusinessException(DappErrorCode.DAPP_ALREADY_EXISTS);
    if (code === "55P03") return new BusinessException(DappErrorCode.DAPP_CHANGED);
    return error;
}

/**
 * Describes a thrown value for a log line by its name and driver code, never by its message.
 * @param error The thrown value.
 * @returns The description.
 */
function describeError(error: unknown): string {
    if (!(error instanceof Error)) return typeof error;
    const driverCode = "code" in error ? error.code : undefined;
    return typeof driverCode === "string" ? `${error.name} (${driverCode})` : error.name;
}

/**
 * Escapes LIKE wildcards so the value matches literally.
 * @param value The search text.
 * @returns The escaped text.
 */
function escapeLike(value: string): string {
    return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

/**
 * Builds the Auth0 client of a dApp.
 * @param dapp The dApp.
 * @returns The client.
 */
function clientOf(dapp: Dapp): DappClient {
    return {
        dappId: dapp.id,
        name: dapp.name,
        description: dapp.description,
        logoUrl: dapp.logoUrl,
        callbackUrls: dapp.callbackUrls,
        logoutUrls: dapp.logoutUrls,
        webOrigins: dapp.webOrigins,
    };
}

/**
 * Builds the filters of the admin list. TypeORM ORs the entries of the array and ANDs the fields of each.
 * @param request The filters.
 * @returns The find conditions, or null when the filters cannot match together.
 */
function listFilters({ needsReview, status, search }: ListDappsRequest): FindOptionsWhere<Dapp>[] | null {
    if (needsReview && status !== undefined && status !== DappStatus.PENDING) return null;
    const scope: FindOptionsWhere<Dapp> = { status: needsReview ? DappStatus.PENDING : status };
    if (search === undefined) return [scope];
    const pattern = ILike(`%${escapeLike(search)}%`);
    return (["name", "ownerEmail", "contactEmail", "auth0ClientId"] as const).map((column) => ({ ...scope, [column]: pattern }));
}

@Injectable()
export class DappService {
    private readonly logger = new Logger(DappService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        @Inject(AUTH0_PROVISIONER) private readonly provisioner: IAuth0ProvisionerService,
        @Inject(SLACK_NOTIFIER) private readonly slack: ISlackNotifierService,
        private readonly metrics: DappMetricsProvider,
    ) {}

    /**
     * Lists dApps. An admin gets one page of every dApp that matches the filters, sorted by creation time unless a column is
     * given, the id breaking ties. Anyone else gets their own live dApp, if any, and their filters are ignored.
     * @param user The caller.
     * @param request The filters, sort and page.
     * @returns The page.
     */
    async list(user: SessionUser, request: ListDappsRequest): Promise<PaginatedDappsDto> {
        if (user.role !== Role.ADMIN) {
            const own = await this.dataSource.manager.findBy(Dapp, { ownerEmail: user.email, status: Not(DappStatus.REMOVED) });
            return PaginatedDappsDto.fromEntities(own, own.length, 1, DEFAULT_PAGE_SIZE);
        }
        const page = request.page ?? 1;
        const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
        const direction = request.order ?? OrderType.ASC;
        const where = listFilters(request);
        if (where === null) return PaginatedDappsDto.fromEntities([], 0, page, pageSize);
        const [items, total] = await this.dataSource.manager.findAndCount(Dapp, {
            where,
            order: { [request.orderBy ?? "createdAt"]: direction, id: direction },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return PaginatedDappsDto.fromEntities(items, total, page, pageSize);
    }

    /**
     * Reads one dApp. An admin can read any dApp, anyone else only their own.
     * @param user The caller.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async get(user: SessionUser, id: string): Promise<DappDto> {
        const dapp = await this.dataSource.manager.findOneBy(Dapp, user.role === Role.ADMIN ? { id } : { id, ownerEmail: user.email });
        if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        return DappDto.fromEntity(dapp);
    }

    /**
     * Registers a pending dApp for the caller. With auto-approval on, creates its Auth0 client and approves it. A failed Auth0
     * call leaves it pending with the error recorded. Alerts the admins of the new dApp, whether it waits for review or not.
     * @param user The owner.
     * @param request The dApp's fields.
     * @returns The new dApp.
     */
    async create(user: SessionUser, request: CreateDappRequest): Promise<DappDto> {
        const { dapp, alert } = await this.counted("create", () =>
            this.transaction(async (manager): Promise<Outcome> => {
                const pending = await manager.save(
                    manager.create(Dapp, { ...request, ownerEmail: user.email, status: DappStatus.PENDING }),
                );
                if (!this.autoApprovalEnabled()) return { dapp: pending, alert: { kind: AdminAlertKind.DAPP_SUBMITTED, dapp: pending } };
                try {
                    const clientId = await this.counted("autoApprove", () => this.provisioner.create(clientOf(pending)));
                    const approved = await manager.save(
                        Object.assign(pending, { status: DappStatus.APPROVED, auth0ClientId: clientId, reviewedAt: new Date() }),
                    );
                    return { dapp: approved, alert: { kind: AdminAlertKind.AUTO_APPROVED, dapp: approved } };
                } catch (error) {
                    return this.recordAuth0Failure(manager, pending, error);
                }
            }),
        );
        this.logger.log(`create dApp ${dapp.id}: ${dapp.status}`);
        await this.notify(alert);
        return DappDto.fromEntity(dapp);
    }

    /**
     * Approves a pending dApp: creates its Auth0 client and sets it approved, clearing any recorded Auth0 error. A failed Auth0
     * call leaves it pending with the error recorded, and alerts the admins.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async approve(id: string): Promise<DappDto> {
        const { dapp, alert } = await this.counted("approve", () =>
            this.transaction(async (manager): Promise<Outcome> => {
                const pending = await this.lockPending(manager, id);
                try {
                    const clientId = await this.provisioner.create(clientOf(pending));
                    const approved = await manager.save(
                        Object.assign(pending, {
                            status: DappStatus.APPROVED,
                            auth0ClientId: clientId,
                            auth0Error: null,
                            reviewedAt: new Date(),
                        }),
                    );
                    return { dapp: approved, alert: null };
                } catch (error) {
                    return this.recordAuth0Failure(manager, pending, error);
                }
            }),
        );
        this.logger.log(`approve dApp ${dapp.id}: ${dapp.status}`);
        await this.notify(alert);
        return DappDto.fromEntity(dapp);
    }

    /**
     * Rejects a pending dApp.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async reject(id: string): Promise<DappDto> {
        const dapp = await this.counted("reject", () =>
            this.transaction(async (manager) =>
                manager.save(Object.assign(await this.lockPending(manager, id), { status: DappStatus.REJECTED, reviewedAt: new Date() })),
            ),
        );
        this.logger.log(`reject dApp ${dapp.id}`);
        return DappDto.fromEntity(dapp);
    }

    /**
     * Locks a dApp's row until the transaction ends.
     * @param manager The transaction's entity manager.
     * @param where The dApp to find.
     * @returns The locked dApp.
     */
    private async lock(manager: EntityManager, where: FindOptionsWhere<Dapp>): Promise<Dapp> {
        const dapp = await manager.findOne(Dapp, { where, lock: { mode: "pessimistic_write" } });
        if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        return dapp;
    }

    /**
     * Locks a dApp that waits for review.
     * @param manager The transaction's entity manager.
     * @param id The dApp id.
     * @returns The locked pending dApp.
     */
    private async lockPending(manager: EntityManager, id: string): Promise<Dapp> {
        const dapp = await this.lock(manager, { id });
        if (dapp.status !== DappStatus.PENDING) throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
        return dapp;
    }

    /**
     * Records a failed Auth0 call on the dApp, leaving its fields and status as they are, and builds the alert. Any other error
     * is rethrown.
     * @param manager The transaction's entity manager.
     * @param dapp The dApp.
     * @param error What the Auth0 call threw.
     * @returns The dApp with the error recorded, and the alert.
     */
    private async recordAuth0Failure(manager: EntityManager, dapp: Dapp, error: unknown): Promise<Outcome> {
        if (!(error instanceof ProvisioningError)) throw error;
        this.logger.warn(`Auth0 call failed for dApp ${dapp.id} (${error.kind}): ${error.message}`);
        const failed = await manager.save(Object.assign(dapp, { auth0Error: error.message }));
        return { dapp: failed, alert: { kind: AdminAlertKind.AUTH0_FAILED, dapp: failed, error: error.message } };
    }

    /**
     * Reads the auto-approval switch.
     * @returns Whether new dApps are approved without review.
     */
    private autoApprovalEnabled(): boolean {
        return this.configService.get<boolean>("admin.autoApprovalEnabled", false);
    }

    /**
     * Runs work in a transaction, mapping the database errors a dApp write can expect to their business error.
     * @param work The work to run.
     * @returns What work returns.
     */
    private async transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
        try {
            return await this.dataSource.transaction(work);
        } catch (error) {
            throw fromPostgresError(error);
        }
    }

    /**
     * Runs a use case and counts its result under its action.
     * @param action The use case.
     * @param work The use case to run.
     * @returns What work returns.
     */
    private async counted<T>(action: TransitionAction, work: () => Promise<T>): Promise<T> {
        try {
            const result = await work();
            this.metrics.countTransition(action, "success");
            return result;
        } catch (error) {
            this.metrics.countTransition(action, error instanceof BusinessException ? error.message : "error");
            throw error;
        }
    }

    /**
     * Sends a Slack alert, logging instead of throwing when it fails, so the owner's write still succeeds.
     * @param alert The alert, or null for none.
     */
    private async notify(alert: SlackAlert | null): Promise<void> {
        if (alert === null) return;
        try {
            await this.slack.notify(alert);
        } catch (error) {
            this.logger.warn(`Slack alert ${alert.kind} for dApp ${alert.dapp.id} failed: ${describeError(error)}`);
        }
    }
}
