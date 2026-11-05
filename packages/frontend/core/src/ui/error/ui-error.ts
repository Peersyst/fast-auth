import { AnyObject } from "@swisstype/essential";

export type UIErrorSeverity = "error" | "warning";

export class UIError extends Error {
    message: string;
    severity: UIErrorSeverity;
    data?: AnyObject;

    constructor(message: string, severity: UIErrorSeverity = "error", data?: AnyObject) {
        super(message);

        this.name = "UIError";
        this.message = message;
        this.severity = severity;
        this.data = data;
    }
}
