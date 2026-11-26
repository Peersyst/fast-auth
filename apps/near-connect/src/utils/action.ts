// Adapted from HOT Labs' near-connect (https://github.com/hot-dao/near-selector), MIT License.
import { transactions as nearApiTransactions, utils as nearApiUtils } from "near-api-js";

interface CreateAccountAction {
    type: "CreateAccount";
}

interface DeployContractAction {
    type: "DeployContract";
    params: { code: Uint8Array };
}

interface FunctionCallAction {
    type: "FunctionCall";
    params: {
        methodName: string;
        args: object;
        gas: string;
        deposit: string;
    };
}

interface TransferAction {
    type: "Transfer";
    params: { deposit: string };
}

interface StakeAction {
    type: "Stake";
    params: {
        stake: string;
        publicKey: string;
    };
}

type AddKeyPermission =
    | "FullAccess"
    | {
          receiverId: string;
          allowance?: string;
          methodNames?: Array<string>;
      };

interface AddKeyAction {
    type: "AddKey";
    params: {
        publicKey: string;
        gasKeyInfo?: unknown;
        accessKey: {
            nonce?: number;
            permission: AddKeyPermission;
        };
    };
}

interface DeleteKeyAction {
    type: "DeleteKey";
    params: { publicKey: string };
}

interface DeleteAccountAction {
    type: "DeleteAccount";
    params: { beneficiaryId: string };
}

interface UnsupportedAction {
    type: "UseGlobalContract" | "DeployGlobalContract" | "TransferToGasKey" | "WithdrawFromGasKey";
}

export type ConnectorAction =
    | CreateAccountAction
    | DeployContractAction
    | FunctionCallAction
    | TransferAction
    | StakeAction
    | AddKeyAction
    | DeleteKeyAction
    | DeleteAccountAction
    | UnsupportedAction;

export const toNearApiJsAction = (action: ConnectorAction): nearApiTransactions.Action => {
    switch (action.type) {
        case "CreateAccount":
            return nearApiTransactions.createAccount();
        case "DeployContract": {
            const { code } = action.params;
            return nearApiTransactions.deployContract(code);
        }
        case "FunctionCall": {
            const { methodName, args, gas, deposit } = action.params;
            return nearApiTransactions.functionCall(methodName, args, BigInt(gas), BigInt(deposit));
        }
        case "Transfer": {
            const { deposit } = action.params;
            return nearApiTransactions.transfer(BigInt(deposit));
        }
        case "Stake": {
            const { stake, publicKey } = action.params;
            return nearApiTransactions.stake(BigInt(stake), nearApiUtils.PublicKey.from(publicKey));
        }
        case "AddKey": {
            const { publicKey, gasKeyInfo, accessKey } = action.params;
            if (gasKeyInfo) throw new Error("NEAR Auth cannot add gas keys");
            const { permission } = accessKey;
            const key =
                permission === "FullAccess"
                    ? nearApiTransactions.fullAccessKey()
                    : nearApiTransactions.functionCallAccessKey(
                          permission.receiverId,
                          permission.methodNames ?? [],
                          permission.allowance ? BigInt(permission.allowance) : undefined,
                      );
            return nearApiTransactions.addKey(nearApiUtils.PublicKey.from(publicKey), key);
        }
        case "DeleteKey": {
            const { publicKey } = action.params;
            return nearApiTransactions.deleteKey(nearApiUtils.PublicKey.from(publicKey));
        }
        case "DeleteAccount": {
            const { beneficiaryId } = action.params;
            return nearApiTransactions.deleteAccount(beneficiaryId);
        }
        default:
            throw new Error(`NEAR Auth cannot sign ${action.type} actions`);
    }
};
