import { State } from "@frontend/core/domain/state";
import { Controller } from "@frontend/core/domain/controller";
import { Theme } from "../../../common/types";
import { ISettingsRepository } from "../../interfaces";
import { ISettingsState } from "../../../ui/state";
import { ISettingsController } from "../../../ui/interfaces";

@Controller()
export class SettingsController implements ISettingsController {
    constructor(
        private readonly settingsRepository: ISettingsRepository,
        readonly settingsState: State<ISettingsState>,
    ) {}

    /**
     * @inheritdoc
     */
    async onInit(): Promise<void> {
        const settings = await this.settingsRepository.getSettings();

        if (settings) {
            this.settingsState.setState(settings);
        }
    }

    /**
     * @inheritdoc
     */
    async setTheme(theme: Theme): Promise<void> {
        this.settingsState.setState({ theme });
        return this.settingsRepository.setTheme(theme);
    }
}
