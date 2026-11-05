import { createContext } from "react";
import { IConfigManager } from "../../core/interfaces";

export const ConfigManagerContext = createContext<IConfigManager | undefined>(undefined);

export const ConfigManagerProvider = ConfigManagerContext.Provider;
export const ConfigManagerConsumer = ConfigManagerContext.Consumer;
