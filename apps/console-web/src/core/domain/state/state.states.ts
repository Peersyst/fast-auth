import { StateManager } from "@frontend/core/domain/state/manager";
import { settingsState } from "@frontend/settings/domain/state";
import { ISettingsState } from "@frontend/settings/ui/state";

declare module "@frontend/core/domain/state/manager" {
    export interface IStates {
        settings: ISettingsState;
    }
}

// Create states
StateManager.createStates({
    settings: settingsState,
});
