import fs from "node:fs";
import path from "node:path";

export type MigrationConfig = {
    firebase: {
        file: string;
    };
    bypassJwt: {
        privateKeyPem: string;
        jwtIssuer: string;
        jwtAudience: string;
    };
    oldMpc: {
        url: string;
        tmpPrivateKey: string;
        salt: number;
    };
    near: {
        relayerPrivateKey: string;
        networkId: string;
        nodeUrl: string;
        indexerUrl: string;
    };
    fastAuth: {
        mpcContractId: string;
        contractId: string;
        domainUrl: string;
    };
    queue: {
        redis: string;
    };
};

/**
 *
 */
export const initMigrationConfig = (): MigrationConfig => {
    let config = {};
    try {
        const configFile = fs.readFileSync("config.json", "utf8");
        config = JSON.parse(configFile.toString());
    } catch (_) {
        console.warn("Could not read config, using default");
    }
    return {
        firebase: {
            file: path.join(__dirname, "../../data/firebase-export.json"),
        },
        bypassJwt: {
            privateKeyPem: "-----BEGIN PRIVATE KEY-----\nMIIEvAI...IbiFCFzqBw0UQ==\n-----END PRIVATE KEY-----\n",
            jwtIssuer: "https://securetoken.google.com/near-mobile-99e38",
            jwtAudience: "near-mobile-99e38",
        },
        oldMpc: {
            url: "https://mpc.mainnet.sig.network",
            tmpPrivateKey: "ed25519:MHz6wrZAegmeCXT6frJCJLYtGy39pz48JFeu2R1zKpeS74PVbaCXnZ1h8cCNzt9yyr2rq9DFswJWx7gWD5gRgFd",
            salt: 3177899144,
        },
        near: {
            relayerPrivateKey: "ed25519:MHz6wrZAegmeCXT6frJCJLYtGy39pz48JFeu2R1zKpeS74PVbaCXnZ1h8cCNzt9yyr2rq9DFswJWx7gWD5gRgFd",
            networkId: "mainnet",
            nodeUrl: "https://rpc.near.org",
            indexerUrl: "https://api.nearblocks.io",
        },
        fastAuth: {
            mpcContractId: "v1.signer",
            contractId: "fast-auth.near",
            domainUrl: "https://domain.com",
        },
        queue: {
            redis: "redis://localhost",
        },
        ...config,
    };
};
