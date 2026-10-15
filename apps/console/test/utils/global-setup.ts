import "./load-env";
import { loadConfig } from "../../src/config";
import { runMigrations } from "../../src/database/migrate";

export default async function globalSetup(): Promise<void> {
    await runMigrations(loadConfig());
}
