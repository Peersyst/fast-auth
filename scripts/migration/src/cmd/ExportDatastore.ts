import { Datastore } from "@google-cloud/datastore";
import * as fs from "fs";

const datastore = new Datastore({
    projectId: "near-mobile-99e38",
});

/**
 *
 * @param kind
 * @param format
 */
async function exportDatastore(kind: string, format: "json" | "csv" = "json") {
    console.log("query");
    const query = datastore.createQuery(kind);
    console.log("runquery");
    const [entities] = await datastore.runQuery(query);
    console.log("entities", entities.length);

    if (format === "json") {
        fs.writeFileSync(`${kind}.json`, JSON.stringify(entities, null, 2));
        console.log(`✅ Exported ${entities.length} entities from ${kind} to ${kind}.json`);
    } else {
        const keys = new Set<string>();
        entities.forEach((e) => Object.keys(e).forEach((k) => keys.add(k)));
        const headers = Array.from(keys);
        const csv = [headers.join(","), ...entities.map((e) => headers.map((h) => JSON.stringify(e[h] ?? "")).join(","))].join("\n");

        fs.writeFileSync(`${kind}.csv`, csv);
        console.log(`✅ Exported ${entities.length} entities from ${kind} to ${kind}.csv`);
    }
}

(async () => {
    // Example: list all kinds and export them
    const kinds = ["EncryptedUserCredentials-mainnet"]; // You need to list kinds manually or from metadata
    for (const kind of kinds) {
        await exportDatastore(kind, "json");
    }
})();
