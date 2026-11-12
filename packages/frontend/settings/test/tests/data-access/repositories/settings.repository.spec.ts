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
            const settings: Settings = { theme: "dark" };
            storageMock.getItem.mockReturnValue(settings);

            await expect(settingsRepository.getSettings()).resolves.toEqual(settings);
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
