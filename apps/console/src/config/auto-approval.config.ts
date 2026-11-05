import { buildConfig, validPositiveInt } from "@backend/config";

export interface AutoApprovalConfig {
    /** At most this many new submissions are chosen for auto-approval in any 24 hours. */
    dailyCap: number;
}

/**
 * Builds the auto-approval configuration.
 * @returns The auto-approval configuration.
 */
export default (): AutoApprovalConfig => {
    return buildConfig<AutoApprovalConfig>(
        { dailyCap: process.env.AUTO_APPROVAL_DAILY_CAP ? parseInt(process.env.AUTO_APPROVAL_DAILY_CAP) : 10 },
        { dailyCap: validPositiveInt },
    );
};
