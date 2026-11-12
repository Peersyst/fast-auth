import "@frontend/config";
import { NearNetwork } from "@frontend/config";

/**
 * What a dApp plugs into on a NEAR network once approved.
 */
export type NearNetworkSettings = {
    /**
     * The audience NEAR Auth signs for by default on the network.
     */
    signingAudience: string;
    fastAuthContract: string;
    mpcContract: string;
    resourcesUrl: string;
};

declare module "@frontend/config" {
    export interface Config {
        docsUrl: string;
        applyDocsUrl: string;
        supportUrl: string;
        nearNetworks: Record<NearNetwork, NearNetworkSettings>;
    }
}
