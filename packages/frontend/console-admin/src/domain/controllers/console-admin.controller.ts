import { Controller } from "@frontend/core/domain/controller";
import { ApiErrors, DefaultError } from "@frontend/core/domain/error/decorators";
import { AdminDappDto, DappEventDto, PaginatedDappsDto, SettingsDto } from "@shared/console";
import { AdminEditDappParams, DappActionParams, IConsoleAdminController, ListDappsParams } from "../../ui/interfaces";
import { CONSOLE_ADMIN_API_ERRORS, CONSOLE_ADMIN_GET_DAPP_ERRORS, ConsoleAdminErrors } from "../console-admin.errors";
import { IConsoleAdminApi, IConsoleSettingApi } from "../interfaces";

const PAGE_SIZE = 20;

@Controller()
export class ConsoleAdminController implements IConsoleAdminController {
    constructor(
        private readonly consoleAdminApi: IConsoleAdminApi,
        private readonly consoleSettingApi: IConsoleSettingApi,
    ) {}

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async listDapps({ page, order, orderBy, needsReview, status, search }: ListDappsParams): Promise<PaginatedDappsDto> {
        return this.consoleAdminApi.list(page, PAGE_SIZE, order, orderBy, needsReview, status, search);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_GET_DAPP_ERRORS)
    async getDapp(id: string): Promise<AdminDappDto> {
        return this.consoleAdminApi.get(id);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async getDappEvents(id: string): Promise<DappEventDto[]> {
        return this.consoleAdminApi.listEvents(id);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async editDapp({ id, request }: AdminEditDappParams): Promise<AdminDappDto> {
        return this.consoleAdminApi.edit(id, request);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async approveDapp({ id, expectedVersion }: DappActionParams): Promise<AdminDappDto> {
        return this.consoleAdminApi.approve(id, { expectedVersion });
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async rejectDapp({ id, expectedVersion }: DappActionParams): Promise<AdminDappDto> {
        return this.consoleAdminApi.reject(id, { expectedVersion });
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async approveChange({ id, expectedVersion }: DappActionParams): Promise<AdminDappDto> {
        return this.consoleAdminApi.approveChange(id, { expectedVersion });
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async rejectChange({ id, expectedVersion }: DappActionParams): Promise<AdminDappDto> {
        return this.consoleAdminApi.rejectChange(id, { expectedVersion });
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async removeDapp({ id, expectedVersion }: DappActionParams): Promise<AdminDappDto> {
        return this.consoleAdminApi.remove(id, { expectedVersion });
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async getSettings(): Promise<SettingsDto> {
        return this.consoleSettingApi.get();
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async setAutoApproval(enabled: boolean): Promise<SettingsDto> {
        return this.consoleSettingApi.update({ autoApproval: { enabled } });
    }
}
