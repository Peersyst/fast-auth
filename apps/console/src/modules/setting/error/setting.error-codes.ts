import { HttpStatus } from "@nestjs/common";

export enum SettingErrorCode {
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
}

export const SettingErrorBody: Record<SettingErrorCode, { statusCode: HttpStatus; message: string }> = {
    [SettingErrorCode.SETTINGS_CHANGED]: { statusCode: HttpStatus.CONFLICT, message: SettingErrorCode.SETTINGS_CHANGED },
};
