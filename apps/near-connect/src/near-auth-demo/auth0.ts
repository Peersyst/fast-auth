import type * as real from "../near-auth/auth0";
import { getConfig } from "../near-auth/config";

export * from "../near-auth/auth0";

const DEMO_SUB = "google-oauth2|100000000000000000000";

export const authorize: typeof real.authorize = async (domain, _clientId, params) => {
    // On mainnet the fixed identity maps to an implicit account no demo user controls, which someone could fund.
    if (domain !== getConfig("testnet").auth0Domain) throw new Error("The NEAR Auth demo build only supports testnet");

    await window.selector.ui.whenApprove({
        title: `Demo build: ${params.popupBlockedPrompt.title}. Nothing is actually signed or sent to the network.`,
        button: "Continue (demo)",
    });

    const approved = params.extraParams?.transaction ?? params.extraParams?.nep413;
    const token = `demo.${btoa(JSON.stringify({ sub: DEMO_SUB, fatxn: approved?.split(",").map(Number) }))}.demo`;
    return { accessToken: token, idToken: token };
};
