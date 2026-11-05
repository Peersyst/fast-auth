import { StateStorage } from "zustand/middleware";
import { CreateStateReturn } from "../create-state";

export interface IStates {}

export type States<S extends Record<string, any> = IStates> = { [K in keyof S]: CreateStateReturn<S[K]> };

export interface IStateManager {
    initialization: Promise<void>;
    readonly persistenceStorage: StateStorage | undefined;
    setPersistenceStorage(storage: StateStorage): void;
    readonly states: States;
    createStates(extraStates: States<IStates>): void;
}
