import { bootstrapMigration } from "./bootstrapMigration";

(async () => {
    const { mpcDatabase, mpcUserQueue } = bootstrapMigration();

    await mpcDatabase.iterateAll(async (user) => {
        await mpcUserQueue.add({ user });
    });

    process.exit(0);
})();
