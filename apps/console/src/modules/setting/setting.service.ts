import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, QueryFailedError, Repository } from "typeorm";
import { AUTO_APPROVAL_SETTING, Setting, SettingEvent } from "@database/console/entities";
import { BusinessException } from "../common/exception/business.exception";
import { SettingErrorCode } from "./error/setting.error-codes";
import { UpdateSettingsRequest } from "./requests/update-settings.request";
import { SettingsDto } from "./dtos/settings.dto";

@Injectable()
export class SettingService {
    constructor(
        @InjectRepository(Setting) private readonly settingRepository: Repository<Setting>,
        @Inject(ConfigService) private readonly configService: ConfigService,
    ) {}

    /**
     * Reads whether auto-approval is on, treating any stored value but true as off.
     * @param manager The entity manager to read with, a transaction's when given.
     * @param lock Whether to lock the row until the transaction ends.
     * @returns Whether auto-approval is on.
     */
    async isAutoApprovalEnabled(manager: EntityManager = this.settingRepository.manager, lock = false): Promise<boolean> {
        const setting = await manager.findOneOrFail(Setting, {
            where: { key: AUTO_APPROVAL_SETTING },
            ...(lock && { lock: { mode: "pessimistic_write" as const } }),
        });
        return setting.value.enabled === true;
    }

    /**
     * Reads the settings.
     * @returns The settings.
     */
    async get(): Promise<SettingsDto> {
        return SettingsDto.fromAutoApproval(await this.isAutoApprovalEnabled(), this.configService.get<number>("autoApproval.dailyCap")!);
    }

    /**
     * Applies the settings under a row lock, recording a change with the admin's email only when the value differs.
     * @param request The new settings.
     * @param actorEmail The admin's email.
     * @returns The settings after the change.
     */
    async update(request: UpdateSettingsRequest, actorEmail: string): Promise<SettingsDto> {
        const enabled = request.autoApproval.enabled;
        await this.settingRepository.manager
            .transaction(async (manager) => {
                const current = await this.isAutoApprovalEnabled(manager, true);
                if (current === enabled) return;
                await manager.update(Setting, { key: AUTO_APPROVAL_SETTING }, { value: { enabled } });
                await manager.insert(SettingEvent, {
                    key: AUTO_APPROVAL_SETTING,
                    oldValue: { enabled: current },
                    newValue: { enabled },
                    actorEmail,
                });
            })
            .catch((error: unknown) => {
                // An auto-approval holds the settings row while it decides; outwaiting the lock timeout is a retryable conflict.
                if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === "55P03") {
                    throw new BusinessException(SettingErrorCode.SETTINGS_CHANGED);
                }
                throw error;
            });
        return this.get();
    }
}
