import { initMigrationConfig } from "../config/migrationConfig";
import { MpcDatabase } from "../database/MpcDatabase";
import { FirebaseDatabase } from "../database/FirebaseDatabase";
import { MPCProvider } from "../provider/MPCProvider";
import { Near } from "near-api-js";
import { NearProvider } from "../provider/NearProvider";
import { FastAuthProvider } from "../provider/FastAuthProvider";
import { RelayQueue } from "../queue/RelayQueue";
import { SignQueue } from "../queue/SignQueue";
import { AddAccessKeysQueue } from "../queue/AddAccessKeysQueue";
import { MpcUserQueue } from "../queue/MpcUserQueue";

/**
 *
 */
export const bootstrapMigration = () => {
    const config = initMigrationConfig();
    const mpcDatabase = new MpcDatabase(config.datastore.projectId, config.datastore.kind, config.datastore.pageSize);
    const firebaseDatabase = new FirebaseDatabase(config.firebaseDatabaseFile);

    const mpc = new MPCProvider(config.oldMpc.url, config.oldMpc.tmpPrivateKey, config.oldMpc.salt);

    const near = new Near(config.near);
    const nearProvider = new NearProvider(config.near.indexerUrl, near, config.near.relayerPrivateKey);
    const fastAuthProvider = new FastAuthProvider(
        near.connection,
        config.fastAuth.mpcContractId,
        config.fastAuth.contractId,
        config.fastAuth.domainUrl,
    );

    const relayQueue = new RelayQueue(config.queue, nearProvider);
    const signQueue = new SignQueue(config.queue, relayQueue, mpc);
    const addAccessKeysQueue = new AddAccessKeysQueue(config.queue, signQueue, nearProvider);
    const mpcUserQueue = new MpcUserQueue(
        config.queue,
        mpc,
        addAccessKeysQueue,
        firebaseDatabase,
        fastAuthProvider,
        config.oldMpc.bypassPrivateKeyPem,
    );

    return {
        mpcDatabase,
        relayQueue,
        signQueue,
        addAccessKeysQueue,
        mpcUserQueue,
    };
};
