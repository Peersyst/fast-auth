import { AnyObject } from "@swisstype/essential";
import { UIError, UIErrorSeverity } from "../ui-error";

export class BrowserErrorEvent extends Event {
    static type = `ui-error`;

    error: UIError;

    constructor(error: UIError) {
        super(BrowserErrorEvent.type);
        this.error = error;
    }

    /**
     * Adds a listener to the BrowserErrorEvent.
     * @param callback The callback to be called when the event is dispatched.
     */
    static addListener(callback: (event: BrowserErrorEvent) => void): void {
        window.addEventListener(BrowserErrorEvent.type, callback as EventListener);
    }

    /**
     * Removes a listener from the BrowserErrorEvent.
     * @param callback The callback to be removed.
     */
    static removeListener(callback: (event: BrowserErrorEvent) => void): void {
        window.removeEventListener(BrowserErrorEvent.type, callback as EventListener);
    }

    /**
     * Dispatches an error event.
     * @param message The error message.
     * @param severity The severity of the error.
     * @param data The error data.
     */
    static dispatch(message: string, severity: UIErrorSeverity = "error", data?: AnyObject): void {
        window.dispatchEvent(new BrowserErrorEvent(new UIError(message, severity, data)));
    }
}
