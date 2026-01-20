import { SignRequest } from "./sign.request";

export class SignAndSendDelegateActionRequest extends SignRequest {
    receiver_id: string;
}
