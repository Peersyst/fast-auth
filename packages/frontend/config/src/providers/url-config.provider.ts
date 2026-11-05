import { Config } from "../core/types";
import { IConfigProvider } from "../core/manager";

/**
 * Implementation of IConfigProvider using a URL pointing to a JSON file.
 */
export class URLConfigProvider implements IConfigProvider<Config> {
    private readonly url: string;

    constructor(url?: string) {
        if (url || process.env.CONFIG_URL) {
            this.url = (process.env.CONFIG_URL || url)!;
        } else {
            throw new Error("A url should be provided to the URLConfigProvider or define CONFIG_URL");
        }
    }

    /**
     * Fetches the config.
     * @throws When the server answers with a non-2xx status, so the manager falls back to the cached copy.
     * @returns The config.
     */
    async fetchConfig(): Promise<Config> {
        // The S3 object has no Cache-Control, so iOS may reuse a cached copy for 10% of its age and hide a
        // config change for hours. React Native's fetch turns `no-store` on a GET into a unique `_=<timestamp>` query.
        const response = await fetch(this.url, { headers: { "Content-Type": "application/json" }, cache: "no-store" });
        if (!response.ok) throw new Error(`The config request failed with ${response.status}`);
        const data = await response.json();
        return data as Config;
    }
}
