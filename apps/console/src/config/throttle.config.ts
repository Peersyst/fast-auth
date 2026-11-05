import { buildConfig, validPositiveInt } from "@backend/config";

/** Requests per minute each user may send to a throttled route. */
export interface ThrottleConfig {
    submitDappPerMinute: number;
    editDappPerMinute: number;
    adminMutationPerMinute: number;
}

/**
 * Builds the throttle configuration.
 * @returns The throttle configuration.
 */
export default (): ThrottleConfig => {
    return buildConfig<ThrottleConfig>(
        {
            submitDappPerMinute: process.env.THROTTLE_SUBMIT_DAPP_PER_MINUTE ? parseInt(process.env.THROTTLE_SUBMIT_DAPP_PER_MINUTE) : 5,
            editDappPerMinute: process.env.THROTTLE_EDIT_DAPP_PER_MINUTE ? parseInt(process.env.THROTTLE_EDIT_DAPP_PER_MINUTE) : 10,
            adminMutationPerMinute: process.env.THROTTLE_ADMIN_MUTATION_PER_MINUTE
                ? parseInt(process.env.THROTTLE_ADMIN_MUTATION_PER_MINUTE)
                : 60,
        },
        { submitDappPerMinute: validPositiveInt, editDappPerMinute: validPositiveInt, adminMutationPerMinute: validPositiveInt },
    );
};
