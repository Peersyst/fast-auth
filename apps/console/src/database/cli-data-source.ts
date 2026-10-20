import { DataSource } from "typeorm";
import { loadConfig } from "../config";
import { dataSourceOptions } from "./data-source";

const config = loadConfig();
// migration:check and the e2e setup drop this database, and a missing .env.test leaves the shell's DB_NAME in place without an error.
if (!config.database.name.endsWith("_e2e")) {
    throw new Error(`Refusing to use database "${config.database.name}": these tools drop it, so its name must end in _e2e`);
}

export default new DataSource(dataSourceOptions(config));
