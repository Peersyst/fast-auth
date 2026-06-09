import { Algorithm } from "../common/signature/types";

export type NearCallOptions = {
    gas?: bigint;
    deposit?: bigint;
};

export type CreateAccountOptions = NearCallOptions & { algorithm?: Algorithm };
export type CreateSignActionOptions = NearCallOptions;

export type FastAuthSignerOptions = {
    mpcContractId: string;
    fastAuthContractId: string;
};
