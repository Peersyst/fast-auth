import { Body, Controller, Get, HttpCode, Post, Query, Redirect, Res } from "@nestjs/common";
import type { Response } from "express";
import { BrokerService } from "./broker.service";
import { AuthorizeRequest } from "./requests/authorize.request";
import { CallbackRequest } from "./requests/callback.request";
import { LogoutRequest } from "./requests/logout.request";
import { TokenRequest } from "./requests/token.request";

/** The part of Auth0's API that auth0-spa-js calls, so a dApp uses the broker as its Auth0 domain. */
@Controller()
export class BrokerController {
    constructor(private readonly broker: BrokerService) {}

    /**
     * Starts a dApp's sign-in.
     * @param request The authorize request.
     * @returns The Auth0 URL to redirect to.
     */
    @Get("authorize")
    @Redirect()
    authorize(@Query() request: AuthorizeRequest): { url: string } {
        return { url: this.broker.authorizeUrl(request) };
    }

    /**
     * Where Auth0 sends the user back. Answers the dApp by redirect, or by postMessage to a popup's opener.
     * @param request Auth0's callback.
     * @param res The response.
     */
    @Get("callback")
    async callback(@Query() request: CallbackRequest, @Res() res: Response): Promise<void> {
        const { flow, params } = await this.broker.finish(request);
        const response = { ...params, state: flow.state };
        if (flow.responseMode === "web_message") {
            // Only the dApp's origin can read the message. `<` is escaped so that the dApp's state cannot end the script.
            const message = JSON.stringify({ type: "authorization_response", response }).replace(/</g, "\\u003c");
            const origin = JSON.stringify(new URL(flow.redirectUri).origin);
            res.send(`<script>window.opener.postMessage(${message}, ${origin});</script>`);
        } else {
            const url = new URL(flow.redirectUri);
            for (const [name, value] of Object.entries(response)) url.searchParams.set(name, value);
            res.redirect(url.toString());
        }
    }

    /**
     * Redeems the broker's code for Auth0's tokens.
     * @param request The token request.
     * @returns Auth0's tokens.
     */
    @Post("oauth/token")
    @HttpCode(200)
    token(@Body() request: TokenRequest): unknown {
        return this.broker.redeem(request);
    }

    /**
     * Signs the user out. Every login asks them to sign in again, so this only sends them back to the dApp.
     * @param request The logout request.
     * @param res The response.
     */
    @Get("v2/logout")
    logout(@Query() request: LogoutRequest, @Res() res: Response): void {
        if (request.returnTo) res.redirect(request.returnTo);
        else res.send("You are signed out.");
    }
}
