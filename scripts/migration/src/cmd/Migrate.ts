import { MPCProvider } from "../provider/MPCProvider";
import { Near } from "near-api-js";
import { FastAuthProvider } from "../provider/FastAuthProvider";
import { FirebaseDatabase } from "../database/FirebaseDatabase";
import { NearProvider } from "../provider/NearProvider";
import { SignQueue } from "../queue/SignQueue";
import { RelayQueue } from "../queue/RelayQueue";
import { AddAccessKeysQueue } from "../queue/AddAccessKeysQueue";
import { MpcDatabase } from "../database/MpcDatabase";
import { MpcUserQueue } from "../queue/MpcUserQueue";
import { initMigrationConfig } from "../config/migrationConfig";

(async () => {
    const config = initMigrationConfig();
    const mpcDatabase = new MpcDatabase(config.mpcDatabaseFile);
    const firebaseDatabase = new FirebaseDatabase(config.firebaseDatabaseFile);

    const mpc = new MPCProvider(config.oldMpc.url, config.oldMpc.tmpPrivateKey, config.oldMpc.salt);

    const near = new Near(config.near);
    const nearProvider = new NearProvider(config.near.indexerUrl, near);
    const fastAuthProvider = new FastAuthProvider(
        near.connection,
        config.fastAuth.mpcContractId,
        config.fastAuth.contractId,
        config.fastAuth.domainUrl,
    );

    const relayQueue = new RelayQueue(config.queue, nearProvider);
    const signQueue = new SignQueue(config.queue, relayQueue, mpc, config.oldMpc.bypassJwt);
    const addAccessKeysQueue = new AddAccessKeysQueue(config.queue, signQueue, nearProvider);
    const mpcUserQueue = new MpcUserQueue(config.queue, addAccessKeysQueue, firebaseDatabase, fastAuthProvider);

    for (const user of mpcDatabase.findAll()) {
        await mpcUserQueue.add({ user });
    }

    await Promise.all([relayQueue.process(), signQueue.process(), addAccessKeysQueue.process(), mpcUserQueue.process()]);
})();
