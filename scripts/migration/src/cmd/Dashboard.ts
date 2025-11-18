import express from "express";
import Queue from "bull";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { QUEUE_NAME as MPC_USER_QUEUE_NAME } from "../queue/MpcUserQueue";
import { QUEUE_NAME as ADD_ACCESS_KEY_QUEUE_NAME } from "../queue/AddAccessKeysQueue";
import { QUEUE_NAME as SIGN_QUEUE_NAME } from "../queue/SignQueue";
import { QUEUE_NAME as RELAY_QUEUE_NAME } from "../queue/RelayQueue";
import { initMigrationConfig } from "../config/migrationConfig";

(async () => {
    const migrateConfig = initMigrationConfig();

    const mpcQueue = new Queue(MPC_USER_QUEUE_NAME, migrateConfig.queue);
    const addAccessKeyQueue = new Queue(ADD_ACCESS_KEY_QUEUE_NAME, migrateConfig.queue);
    const signQueue = new Queue(SIGN_QUEUE_NAME, migrateConfig.queue);
    const relayQueue = new Queue(RELAY_QUEUE_NAME, migrateConfig.queue);

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/admin");

    createBullBoard({
        queues: [new BullAdapter(mpcQueue), new BullAdapter(addAccessKeyQueue), new BullAdapter(signQueue), new BullAdapter(relayQueue)],
        serverAdapter: serverAdapter,
    });

    const app = express();

    app.use("/admin", serverAdapter.getRouter());

    app.listen(3009, () => {
        console.log("Running on 3009...");
        console.log("For the UI, open http://localhost:3000/admin");
        console.log("Make sure Redis is running on port 6379 by default");
    });
})();
