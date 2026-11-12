import { EventEmitter } from "@frontend/events";
import { BaseConfig } from "../types";
import { ConfigManagerEvents } from "../../interfaces";

export class ConfigManagerEventEmitter<Config extends BaseConfig> extends EventEmitter<ConfigManagerEvents<Config>> {}
