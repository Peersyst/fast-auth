import { Service } from "@frontend/core/data-access/service";
import { ILocalizationService } from "../../../domain/interfaces";

@Service()
export class BrowserLocalizationService implements ILocalizationService {
    /**
     * Gets the browser locale.
     * @returns The browser locale or "en" if the `window` is not defined.
     */
    private getBrowserLocale(): string {
        if (typeof window === "undefined") {
            return "en";
        }

        return window.navigator.language;
    }

    /**
     * @inheritdoc
     */
    getLocale(): Promise<string> {
        return Promise.resolve(this.getBrowserLocale());
    }
}
