import { Controller } from "@frontend/core/domain/controller";
import { ApiErrors, DefaultError } from "@frontend/core/domain/error/decorators";
import { DappDto, PaginatedDappsDto } from "@shared/console";
import { IConsoleAdminController } from "../../ui/interfaces";
import { CONSOLE_ADMIN_API_ERRORS, CONSOLE_ADMIN_GET_DAPP_ERRORS, ConsoleAdminErrors } from "../console-admin.errors";
import { IConsoleAdminApi } from "../interfaces";

const PAGE_SIZE = 20;

@Controller()
export class ConsoleAdminController implements IConsoleAdminController {
    constructor(private readonly consoleAdminApi: IConsoleAdminApi) {}

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async listDapps(page: number): Promise<PaginatedDappsDto> {
        return this.consoleAdminApi.list(page, PAGE_SIZE);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_GET_DAPP_ERRORS)
    async getDapp(id: string): Promise<DappDto> {
        return this.consoleAdminApi.get(id);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async approveDapp(id: string): Promise<DappDto> {
        return this.consoleAdminApi.approve(id);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async rejectDapp(id: string): Promise<DappDto> {
        return this.consoleAdminApi.reject(id);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async approveChange(id: string): Promise<DappDto> {
        return this.consoleAdminApi.approveChange(id);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAdminErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_ADMIN_API_ERRORS)
    async rejectChange(id: string): Promise<DappDto> {
        return this.consoleAdminApi.rejectChange(id);
    }
}
