import { Body, Controller, Get, HttpCode, Options, Post, Query, Req, Res, UseFilters } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Request, Response } from "express";
import { BrokerConfig } from "../../config/broker.config";
import { BrokerErrorFilter } from "./broker-error.filter";
import { BrokerService } from "./broker.service";
import type { Query as QueryParams, TokenSet } from "./broker.types";
import { deliver, readCookie, renderPage } from "./responses";

// One cookie per sign-in, so that two sign-ins in the same browser do not overwrite each other. `__Host-` keeps a
// sibling domain from setting it, and SameSite=Lax still sends it on Auth0's redirect back to the callback.
const FLOW_COOKIE_PREFIX = "__Host-flow-";
const LOGOUT_COOKIE = "__Host-logout";

/**
 * The part of Auth0's API that `auth0-spa-js` calls, so that a dApp uses the broker by setting it as its Auth0 domain.
 */
@Controller()
@UseFilters(BrokerErrorFilter)
export class BrokerController {
    private readonly cookieOptions: CookieOptions;

    constructor(
        private readonly broker: BrokerService,
        config: ConfigService,
    ) {
        const { flowTtlMs } = config.getOrThrow<BrokerConfig>("broker");
        this.cookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: flowTtlMs };
    }

    /**
     * Starts a sign-in: ties it to this browser and sends the user on to Auth0.
     * @param query The dApp's authorize request.
     * @param res The response.
     */
    @Get("authorize")
    authorize(@Query() query: QueryParams, @Res() res: Response): void {
        const { authorizeUrl, flowId, binding } = this.broker.startSignIn(query);
        res.cookie(FLOW_COOKIE_PREFIX + flowId, binding, this.cookieOptions);
        res.redirect(302, authorizeUrl);
    }

    /**
     * Where Auth0 sends the user back. Answers the dApp with a code of the broker's, or with Auth0's error.
     * @param query Auth0's callback params.
     * @param req The request.
     * @param res The response.
     */
    @Get("callback")
    async callback(@Query() query: QueryParams, @Req() req: Request, @Res() res: Response): Promise<void> {
        const cookie = FLOW_COOKIE_PREFIX + (typeof query.state === "string" ? query.state : "");
        const binding = readCookie(req, cookie);
        res.clearCookie(cookie, { ...this.cookieOptions, maxAge: undefined });
        const { dapp, params } = await this.broker.finishSignIn(query, binding);
        deliver(res, dapp, params);
    }

    /**
     * Lets any dApp's page call the token endpoint. Only the dApp that holds the code and its verifier gets anything.
     * @param req The request.
     * @param res The response.
     */
    @Options("oauth/token")
    tokenPreflight(@Req() req: Request, @Res() res: Response): void {
        allowOrigin(req, res);
        res.setHeader("Access-Control-Allow-Methods", "POST");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Auth0-Client");
        res.setHeader("Access-Control-Max-Age", "600");
        res.status(204).end();
    }

    /**
     * Redeems a code the broker handed the dApp.
     * @param body The token request, form encoded or JSON.
     * @param req The request.
     * @param res The response.
     * @returns Auth0's tokens.
     */
    @Post("oauth/token")
    @HttpCode(200)
    token(@Body() body: QueryParams | undefined, @Req() req: Request, @Res({ passthrough: true }) res: Response): TokenSet {
        allowOrigin(req, res);
        return this.broker.redeem(body ?? {}, req.headers.origin);
    }

    /**
     * Signs the user out of the sandbox tenant, then back to the dApp's returnTo.
     * @param query The dApp's logout request.
     * @param res The response.
     */
    @Get("v2/logout")
    logout(@Query() query: QueryParams, @Res() res: Response): void {
        const { logoutUrl, returnTo } = this.broker.logout(query);
        if (returnTo) res.cookie(LOGOUT_COOKIE, returnTo, this.cookieOptions);
        else res.clearCookie(LOGOUT_COOKIE, { ...this.cookieOptions, maxAge: undefined });
        res.redirect(302, logoutUrl);
    }

    /**
     * Where Auth0 sends the user back after signing them out.
     * @param req The request.
     * @param res The response.
     */
    @Get("logout/callback")
    loggedOut(@Req() req: Request, @Res() res: Response): void {
        const returnTo = this.broker.returnAfterLogout(readCookie(req, LOGOUT_COOKIE));
        res.clearCookie(LOGOUT_COOKIE, { ...this.cookieOptions, maxAge: undefined });
        if (returnTo) res.redirect(302, returnTo);
        else renderPage(res, 200, "You are signed out of the NEAR Auth sandbox.");
    }
}

/**
 * Lets the calling page read the response, whatever its origin.
 * @param req The request.
 * @param res The response.
 */
function allowOrigin(req: Request, res: Response): void {
    res.setHeader("Vary", "Origin");
    if (req.headers.origin) res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
}
