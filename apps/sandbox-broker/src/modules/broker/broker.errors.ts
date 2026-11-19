import { DappReturn } from "./broker.types";

/** An error the broker shows on a page of its own, because it has no safe place to send the user back to. */
export class PageError extends Error {
    constructor(
        message: string,
        readonly status = 400,
    ) {
        super(message);
    }
}

/** An OAuth error the broker sends back to the dApp, by the dApp's response mode. */
export class DappError extends Error {
    constructor(
        readonly dapp: DappReturn,
        readonly error: string,
        readonly description: string,
    ) {
        super(`${error}: ${description}`);
    }
}

/** An error of the token endpoint, answered as the JSON Auth0 would send. */
export class TokenError extends Error {
    constructor(
        readonly status: number,
        readonly error: string,
        readonly description: string,
    ) {
        super(`${error}: ${description}`);
    }
}
