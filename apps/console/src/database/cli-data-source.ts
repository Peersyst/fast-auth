import { DataSource } from "typeorm";
import { loadConfig } from "../config";
import { dataSourceOptions } from "./data-source";

export default new DataSource(dataSourceOptions(loadConfig()));
