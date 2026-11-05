import { SettingsController } from "../../../../src/domain/controllers";
import { SettingsMock } from "../../../mocks/common";
import { SettingsRepositoryMock } from "../../../mocks/data-access/repositories";
import { LocalizationServiceMock } from "../../../mocks/data-access/service/localization.service.mock";
import { SettingsStateMock } from "../../../mocks/domain/settings.state.mock";

describe("SettingsController", () => {
    const settingsMock = new SettingsMock();

    const settingsRepositoryMock = new SettingsRepositoryMock();
    const localizationServiceMock = new LocalizationServiceMock();
    const settingsStateMock = new SettingsStateMock();

    const settingsController = new SettingsController(settingsRepositoryMock, localizationServiceMock, settingsStateMock);

    beforeEach(() => {
        settingsRepositoryMock.clearMocks();
        localizationServiceMock.clearMocks();
        settingsStateMock.clearMocks();
    });

    describe("onInit", () => {
        it("should load persisted settings into state", async () => {
            await settingsController.onInit();

            expect(settingsStateMock.setState).toHaveBeenCalledWith({ locale: "en", theme: "light" });
        });

        it("should leave the state untouched when nothing is persisted", async () => {
            settingsRepositoryMock.getSettings.mockResolvedValueOnce(undefined);

            await settingsController.onInit();

            expect(settingsStateMock.setState).not.toHaveBeenCalled();
        });
    });

    describe("getSettings", () => {
        it("should return settings from repository", async () => {
            const settings = await settingsController.getSettings();

            expect(settings).toEqual({ locale: "en", theme: "light" });
        });
    });

    describe("setSettings", () => {
        it("should set settings in state and repository", async () => {
            await settingsController.setSettings(settingsMock);

            expect(settingsStateMock.setState).toHaveBeenCalledWith({ locale: "en", theme: "light" });
            expect(settingsRepositoryMock.setSettings).toHaveBeenCalledWith({ locale: "en", theme: "light" });
        });
    });

    describe("getLocale", () => {
        it("should return locale from repository", async () => {
            const locale = await settingsController.getLocale();

            expect(locale).toEqual("en");
        });

        it("should match the language of the localization service locale if repository returns undefined", async () => {
            settingsRepositoryMock.getLocale.mockResolvedValueOnce(undefined);
            localizationServiceMock.getLocale.mockResolvedValueOnce("en-GB");

            const locale = await settingsController.getLocale();

            expect(locale).toEqual("en");
        });

        it("should return en if locale is not supported", async () => {
            settingsRepositoryMock.getLocale.mockResolvedValueOnce(undefined);
            localizationServiceMock.getLocale.mockResolvedValueOnce("unsupported");

            const locale = await settingsController.getLocale();

            expect(locale).toEqual("en");
        });
    });

    describe("setLocale", () => {
        it("should set locale in state and repository", async () => {
            await settingsController.setLocale("en");

            expect(settingsStateMock.setState).toHaveBeenCalledWith({ locale: "en" });
            expect(settingsRepositoryMock.setLocale).toHaveBeenCalledWith("en");
        });
    });

    describe("getTheme", () => {
        it("should return theme from repository", async () => {
            const theme = await settingsController.getTheme();

            expect(theme).toEqual("light");
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
