import { AnyObject } from "@swisstype/essential";

export class ServiceError extends Error {
    message: string;
    data?: AnyObject;

    constructor(message: string, data?: AnyObject) {
        super(message);
        this.name = "ServiceError";
        this.message = message;
        this.data = data;
    }
}
