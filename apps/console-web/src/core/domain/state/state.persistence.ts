import { StateManager } from "@frontend/core/domain/state/manager";

// Set persistence storage to persist states
StateManager.setPersistenceStorage(localStorage);
