import { bootstrapMigration } from "./bootstrapMigration";

(async () => {
    const { mpcDatabase, mpcUserQueue } = bootstrapMigration();

    for (const user of mpcDatabase.findAll()) {
        await mpcUserQueue.add({ user });
    }
    process.exit(0);
})();
