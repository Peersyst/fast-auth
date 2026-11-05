import { DataSource } from "typeorm";
import { consoleDatabaseConfig } from "./config";

export const ConsoleDatabaseConnectionSource = new DataSource(consoleDatabaseConfig);
