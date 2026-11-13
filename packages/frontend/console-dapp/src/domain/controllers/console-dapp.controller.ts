import { Controller } from "@frontend/core/domain/controller";
import { ApiErrors, DefaultError } from "@frontend/core/domain/error/decorators";
import { CreateDappRequest, DappDto } from "@shared/console";
import { EditDappParams, IConsoleDappController } from "../../ui/interfaces";
import { CONSOLE_DAPP_API_ERRORS, ConsoleDappErrors } from "../console-dapp.errors";
import { IConsoleDappApi } from "../interfaces";

@Controller()
export class ConsoleDappController implements IConsoleDappController {
    constructor(private readonly consoleDappApi: IConsoleDappApi) {}

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleDappErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_DAPP_API_ERRORS)
    async getMyDapp(): Promise<DappDto | null> {
        const { items } = await this.consoleDappApi.list();
        return items[0] ?? null;
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleDappErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_DAPP_API_ERRORS)
    async submitDapp(fields: CreateDappRequest): Promise<DappDto> {
        return this.consoleDappApi.create(fields);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleDappErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_DAPP_API_ERRORS)
    async editDapp({ id, request }: EditDappParams): Promise<DappDto> {
        return this.consoleDappApi.update(id, request);
    }
}
