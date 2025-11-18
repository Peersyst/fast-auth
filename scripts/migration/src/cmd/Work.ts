import { bootstrapMigration } from "./bootstrapMigration";

(async () => {
    const { relayQueue, signQueue, addAccessKeysQueue, mpcUserQueue } = bootstrapMigration();

    const workersRaw = process.argv[2];
    const workers = workersRaw.split(",");

    const processors: Promise<void>[] = [];
    for (const worker of workers) {
        if (worker === "all")
            processors.push(relayQueue.process(), signQueue.process(), addAccessKeysQueue.process(), mpcUserQueue.process());
        else if (worker === "mpcUser") processors.push(mpcUserQueue.process());
        else if (worker === "addAccessKeys") processors.push(addAccessKeysQueue.process());
        else if (worker === "sign") processors.push(signQueue.process());
        else if (worker === "relay") processors.push(relayQueue.process());
        else throw new Error("Unknown worker " + worker);
    }

    await Promise.all(processors);
})();
