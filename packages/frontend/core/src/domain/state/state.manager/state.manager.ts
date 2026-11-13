import { StateStorage } from "zustand/middleware";
import { IStateManager, States, IStates } from "./state.manager.types";
import { CreateStateReturn } from "../create-state";

class StateManager implements IStateManager {
    /**
     * The persistence storage for the state manager.
     */
    private _persistenceStorage: StateStorage | undefined = undefined;
    get persistenceStorage(): StateStorage | undefined {
        return this._persistenceStorage;
    }
    private set persistenceStorage(storage: StateStorage) {
        this._persistenceStorage = storage;
    }

    /**
     * Sets the persistence storage for the state manager.
     * @param storage The persistence storage to set.
     */
    setPersistenceStorage(storage: StateStorage): void {
        this.persistenceStorage = storage;
    }

    /**
     * The resolve function for the initialization promise.
     */
    private resolveInitializationPromise: (() => void) | undefined;
    /**
     * The initialization promise for the state manager.
     */
    initialization = new Promise<void>((resolve) => {
        this.resolveInitializationPromise = resolve;
    });

    /**
     * The states for the state manager.
     */
    private _states = new Proxy({} as States, {
        get() {
            throw new Error("States not initialized");
        },
    });
    get states(): States {
        return this._states;
    }
    private set states(states: States) {
        this._states = states;
    }

    /**
     * Creates the states for the state manager.
     * @param states The states to create.
     */
    createStates(states: States<IStates>): void {
        this.states = states;

        Promise.all(Object.values(this.states).map((state) => (state as CreateStateReturn<any>).promise)).then(() => {
            this.resolveInitializationPromise?.();
        });
    }
}

export default new StateManager();
