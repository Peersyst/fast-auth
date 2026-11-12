import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager, QueryFailedError } from "typeorm";
import { Dapp, OWNER_EMAIL_LIVE_INDEX } from "@database/console/entities";
import { DappStatus } from "@shared/modules/dapp";
import { Role, SessionUser } from "../auth/types/session-user";
import { BusinessException } from "../common/exception/business.exception";
import { AdminAlertKind } from "../notification/interfaces/i-slack-notifier.service";
import type { ISlackNotifierService } from "../notification/interfaces/i-slack-notifier.service";
import { SLACK_NOTIFIER } from "../notification/notification.tokens";
import { DappClient } from "../provisioning/interfaces/i-auth0-provisioner.service";
import type { IAuth0ProvisionerService } from "../provisioning/interfaces/i-auth0-provisioner.service";
import { AUTH0_PROVISIONER } from "../provisioning/provisioning.tokens";
import { DappMetricsProvider } from "./dapp.metrics";
import { DappErrorCode } from "./error/dapp.error-codes";
import { CreateDappRequest } from "./requests/create-dapp.request";
import { DEFAULT_PAGE_SIZE, ListDappsRequest } from "./requests/list-dapps.request";
import { DappDto } from "./dtos/dapp.dto";
import { PaginatedDappsDto } from "./dtos/paginated-dapps.dto";

/**
 * Tells whether the error is the unique index that allows one live dApp per owner email.
 * @param error The thrown value.
 * @returns Whether the owner already has a dApp.
 */
function isOwnerConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    // 23505 is Postgres' unique_violation.
    const { code, constraint } = error.driverError as { code?: string; constraint?: string };
    return code === "23505" && constraint === OWNER_EMAIL_LIVE_INDEX;
}

/**
 * Builds the Auth0 client of a dApp, with the fields its owner submitted.
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
     * Lists dApps, oldest first: every dApp for an admin, and for anyone else their own, which is at most one.
     * @param user The caller.
     * @param request The page.
     * @returns The page.
     */
    async list(user: SessionUser, { page = 1, pageSize = DEFAULT_PAGE_SIZE }: ListDappsRequest): Promise<PaginatedDappsDto> {
        const [dapps, total] = await this.dataSource.manager.findAndCount(Dapp, {
            where: user.role === Role.ADMIN ? {} : { ownerEmail: user.email },
            order: { createdAt: "ASC", id: "ASC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return PaginatedDappsDto.fromEntities(dapps, total, page, pageSize);
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
     * Stores the caller's dApp as pending and alerts the admins, then approves it when auto-approval is on. An owner may only
     * have one dApp.
     * @param user The owner.
     * @param request The dApp's fields.
     * @returns The new dApp.
     */
    async create(user: SessionUser, request: CreateDappRequest): Promise<DappDto> {
        const dapp = this.dataSource.manager.create(Dapp, { ...request, ownerEmail: user.email, status: DappStatus.PENDING });
        try {
            await this.dataSource.manager.save(dapp);
        } catch (error) {
            if (isOwnerConflict(error)) throw new BusinessException(DappErrorCode.DAPP_ALREADY_EXISTS);
            throw error;
        }
        this.logger.log(`Stored pending dApp ${dapp.id}`);
        this.metrics.countTransition("create", "success");
        await this.alertAdmins(dapp);
        if (this.configService.get<boolean>("admin.autoApprovalEnabled", false)) return this.approve(dapp.id);
        return DappDto.fromEntity(dapp);
    }

    /**
     * Approves a pending dApp: creates its Auth0 client with the fields its owner submitted, and stores the client on the dApp.
     * The transaction keeps the dApp pending when either step fails.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async approve(id: string): Promise<DappDto> {
        const dapp = await this.dataSource.transaction(async (manager) => {
            const pending = await this.findPending(manager, id);
            const auth0ClientId = await this.provisioner.create(clientOf(pending));
            return manager.save(Object.assign(pending, { status: DappStatus.APPROVED, auth0ClientId, reviewedAt: new Date() }));
        });
        this.logger.log(`Approved dApp ${dapp.id} with Auth0 client ${dapp.auth0ClientId}`);
        this.metrics.countTransition("approve", "success");
        return DappDto.fromEntity(dapp);
    }

    /**
     * Rejects a pending dApp.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async reject(id: string): Promise<DappDto> {
        const { manager } = this.dataSource;
        const pending = await this.findPending(manager, id);
        const dapp = await manager.save(Object.assign(pending, { status: DappStatus.REJECTED, reviewedAt: new Date() }));
        this.logger.log(`Rejected dApp ${dapp.id}`);
        this.metrics.countTransition("reject", "success");
        return DappDto.fromEntity(dapp);
    }

    /**
     * Reads a dApp that waits for review.
     * @param manager The entity manager to read with.
     * @param id The dApp id.
     * @returns The pending dApp.
     */
    private async findPending(manager: EntityManager, id: string): Promise<Dapp> {
        const dapp = await manager.findOneBy(Dapp, { id });
        if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        if (dapp.status !== DappStatus.PENDING) throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
        return dapp;
    }

    /**
     * Alerts the admins of a new dApp, logging instead of throwing when Slack fails, so the owner's submission still succeeds.
     * @param dapp The new dApp.
     */
    private async alertAdmins(dapp: Dapp): Promise<void> {
        try {
            await this.slack.notify({ kind: AdminAlertKind.DAPP_SUBMITTED, dapp });
        } catch (error) {
            this.logger.warn(`Slack alert for dApp ${dapp.id} failed: ${error instanceof Error ? error.name : typeof error}`);
        }
    }
}
