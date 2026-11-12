import { SettingsController } from "../../../../src/domain/controllers";
import { SettingsRepositoryMock } from "../../../mocks/data-access/repositories";
import { SettingsStateMock } from "../../../mocks/domain/settings.state.mock";

describe("SettingsController", () => {
    const settingsRepositoryMock = new SettingsRepositoryMock();
    const settingsStateMock = new SettingsStateMock();

    const settingsController = new SettingsController(settingsRepositoryMock, settingsStateMock);

    beforeEach(() => {
        settingsRepositoryMock.clearMocks();
        settingsStateMock.clearMocks();
    });

    describe("onInit", () => {
        it("should load persisted settings into state", async () => {
            await settingsController.onInit();

            expect(settingsStateMock.setState).toHaveBeenCalledWith({ theme: "light" });
        });

        it("should leave the state untouched when nothing is persisted", async () => {
            settingsRepositoryMock.getSettings.mockResolvedValueOnce(undefined);

            await settingsController.onInit();

            expect(settingsStateMock.setState).not.toHaveBeenCalled();
        });
    });

    describe("setTheme", () => {
        it("should set theme in state and repository", async () => {
            await settingsController.setTheme("dark");

            expect(settingsStateMock.setState).toHaveBeenCalledWith({ theme: "dark" });
            expect(settingsRepositoryMock.setTheme).toHaveBeenCalledWith("dark");
        });
    });
});
