import { bootstrapMigration } from "./bootstrapMigration";

(async () => {
    const { firebaseDatabase, mpcUserQueue } = bootstrapMigration();

    await firebaseDatabase.iterateAll(async (user) => {
        await mpcUserQueue.add({ user });
    });

    process.exit(0);
})();
