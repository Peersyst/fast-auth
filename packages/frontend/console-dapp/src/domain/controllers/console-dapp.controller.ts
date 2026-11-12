import { Controller } from "@frontend/core/domain/controller";
import { ApiErrors, DefaultError } from "@frontend/core/domain/error/decorators";
import { OwnerDappDto, UpsertDappRequest } from "@shared/console";
import { directFieldsOf, syncedFieldsOf } from "@shared/modules/dapp";
import { EditDappParams, IConsoleDappController, RemoveDappParams, WithdrawChangeParams } from "../../ui/interfaces";
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
    async getMyDapp(): Promise<OwnerDappDto | null> {
        const { dapp } = await this.consoleDappApi.getMine();
        return dapp;
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleDappErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_DAPP_API_ERRORS)
    async submitDapp(fields: UpsertDappRequest): Promise<OwnerDappDto> {
        return this.consoleDappApi.submit(fields);
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleDappErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_DAPP_API_ERRORS)
    async editDapp({ id, request }: EditDappParams): Promise<OwnerDappDto> {
        return this.consoleDappApi.edit(id, request);
    }

    /**
     * @inheritdoc
     */
    withdrawChange({ dapp, expectedVersion }: WithdrawChangeParams): Promise<OwnerDappDto> {
        return this.editDapp({ id: dapp.id, request: { ...syncedFieldsOf(dapp), ...directFieldsOf(dapp), expectedVersion } });
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleDappErrors.CONSOLE_UNREACHABLE)
    @ApiErrors(CONSOLE_DAPP_API_ERRORS)
    async removeDapp({ id, expectedVersion }: RemoveDappParams): Promise<void> {
        await this.consoleDappApi.remove(id, expectedVersion);
    }
}
