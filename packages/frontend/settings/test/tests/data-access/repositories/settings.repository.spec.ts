import { Settings } from "../../../../src/common/types";
import { SettingsRepository } from "../../../../src/data-access/repositories/settings.repository";
import { StorageMock } from "@frontend/core/mocks/data-access/repository";

describe("SettingsRepository", () => {
    let settingsRepository: SettingsRepository;

    const storageMock = new StorageMock();

    beforeEach(() => {
        settingsRepository = new SettingsRepository(storageMock);
    });

    describe("getSettings", () => {
        it("should return the settings", async () => {
            const settings: Settings = { locale: "en" };
            storageMock.getItem.mockReturnValue(settings);

            await expect(settingsRepository.getSettings()).resolves.toEqual(settings);
        });
    });

    describe("setSettings", () => {
        it("should set the settings", async () => {
            const settings: Settings = { locale: "en" };
            storageMock.setItem.mockReturnValue(settings);

            await expect(settingsRepository.setSettings(settings)).resolves.toEqual(settings);
        });
    });

    describe("getLocale", () => {
        it("should return the locale", async () => {
            const settings: Settings = { locale: "en" };
            storageMock.getItem.mockReturnValue(settings);

            await expect(settingsRepository.getLocale()).resolves.toEqual(settings.locale);
        });
    });

    describe("setLocale", () => {
        it("should set the locale", async () => {
            const locale = "en";
            storageMock.setItem.mockReturnValue(locale);

            await expect(settingsRepository.setLocale(locale)).resolves.toEqual(locale);
        });
    });

    describe("getTheme", () => {
        it("should return the theme", async () => {
            const settings: Settings = { theme: "dark" };
            storageMock.getItem.mockReturnValue(settings);

            await expect(settingsRepository.getTheme()).resolves.toEqual(settings.theme);
        });
    });

    describe("setTheme", () => {
        it("should set the theme", async () => {
            const theme = "light";
            storageMock.setItem.mockReturnValue(theme);

            await expect(settingsRepository.setTheme(theme)).resolves.toEqual(theme);
        });
    });
});
