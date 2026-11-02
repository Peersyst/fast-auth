import { DataSource } from "typeorm";
import { loadConfig } from "../config";
import { dataSourceOptions } from "./data-source";

const config = loadConfig();
// migration:check and the integration setup drop this database, and without test/env.cjs loaded the shell's DB_DATABASE is used.
if (!config.database.name.endsWith("_e2e")) {
    throw new Error(`Refusing to use database "${config.database.name}": these tools drop it, so its name must end in _e2e`);
}

export default new DataSource(dataSourceOptions(config));
