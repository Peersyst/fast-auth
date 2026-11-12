import { mockify } from "@shared/test";
import { Settings } from "../../../src/common";

export const SettingsMock = mockify<Settings>({
    theme: "light",
});
