// Adapted from HOT Labs' near-connect (https://github.com/hot-dao/near-selector), MIT License.
import { JsonRpcProvider } from "@near-js/providers";
import { getErrorTypeFromErrorMessage, parseRpcError } from "@near-js/utils";
import { TypedError, type CodeResult } from "@near-js/types";

const TIMEOUT_MS = 30_000;
const TRIES_PER_PROVIDER = 3;

let nextId = 0;

class NetworkError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(`${status} RPC Network Error: ${message}`);
    }
}

// These reject the request itself, so every provider would answer the same way.
const isRequestError = (status: number) => status === 400 || status === 413;

const wait = (timeout: number) => {
    return new Promise<void>((resolve) => setTimeout(resolve, timeout));
};

export class NearRpc extends JsonRpcProvider {
    private currentProviderIndex = 0;

    constructor(private readonly providers: string[]) {
        super({ url: "" });
    }

    async viewMethod<T>(args: { contractId: string; methodName: string; args: object }): Promise<T> {
        const payload = Buffer.from(JSON.stringify(args.args), "utf8").toString("base64");
        const data = await this.query<CodeResult>({
            args_base64: payload,
            finality: "optimistic",
            request_type: "call_function",
            method_name: args.methodName,
            account_id: args.contractId,
        });

        return JSON.parse(Buffer.from(data.result).toString("utf8"));
    }

    async sendJsonRpc<T>(method: string, params: object, attempts = 0): Promise<T> {
        const url = this.providers[this.currentProviderIndex];
        const requestStart = Date.now();

        try {
            return await this.send<T>(method, params, url);
        } catch (error) {
            if (error instanceof NetworkError && !isRequestError(error.status)) {
                this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
                if (attempts + 1 > this.providers.length * TRIES_PER_PROVIDER) {
                    throw error;
                }

                const needTime = 500 * attempts;
                const spent = Date.now() - requestStart;

                if (spent < needTime) {
                    await wait(needTime - spent);
                }
                return await this.sendJsonRpc(method, params, attempts + 1);
            }

            throw error;
        }
    }

    private async send<T>(method: string, params: object, url: string): Promise<T> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const failure = (message: string, status = 0) =>
            controller.signal.aborted ? new NetworkError(0, "Timeout error") : new NetworkError(status, message);

        let response;
        try {
            const req = await fetch(url, {
                body: JSON.stringify({ method, params, id: nextId++, jsonrpc: "2.0" }),
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                method: "POST",
            }).catch(() => {
                throw failure(window.navigator.onLine ? "Could not reach the NEAR RPC" : "No internet connection");
            });

            if (!req.ok) {
                const text = await req.text().catch(() => "Unknown error");
                throw new NetworkError(req.status, text);
            }

            response = await req.json().catch(() => {
                throw failure("The NEAR RPC sent a response that is not JSON", req.status);
            });
        } finally {
            clearTimeout(timer);
        }

        if (response.error) {
            if (response.error.data && typeof response.error.data === "object") {
                const isReadable =
                    typeof response.error.data.error_message === "string" && typeof response.error.data.error_type === "string";
                if (isReadable) {
                    throw new TypedError(response.error.data.error_message, response.error.data.error_type);
                }
                throw parseRpcError(response.error.data);
            }

            const errorMessage = `[${response.error.code}] ${response.error.message}: ${response.error.data}`;
            throw new TypedError(errorMessage, getErrorTypeFromErrorMessage(response.error.data, response.error.name));
        }

        return response.result;
    }
}
