import { buildConfig, getConfigEnv, validEmail, validHttpsUrl, validOneOf, validPositiveInt, validRequired } from "@backend/config";

export enum EmailProviderName {
    SES = "ses",
    FAKE = "fake",
}

/** SES signs with the default AWS credential chain. */
export interface SesConfig {
    from: string;
    region: string;
    timeoutMs: number;
    /** Attempts per email, the first send included. */
    maxAttempts: number;
}

export interface EmailConfig {
    provider: EmailProviderName;
    /** The SES settings, null when the provider is fake. */
    ses: SesConfig | null;
    /** The guide the approval email links to. */
    guideUrl: string;
}

/**
 * Builds the SES configuration.
 * @returns The SES configuration.
 */
const sesConfig = (): SesConfig => {
    return buildConfig<SesConfig>(
        {
            from: process.env.SES_FROM!,
            region: process.env.SES_REGION!,
            timeoutMs: process.env.SES_TIMEOUT_MS ? parseInt(process.env.SES_TIMEOUT_MS) : 10000,
            maxAttempts: process.env.SES_MAX_ATTEMPTS ? parseInt(process.env.SES_MAX_ATTEMPTS) : 2,
        },
        {
            from: validEmail,
            region: validRequired,
            timeoutMs: validPositiveInt,
            maxAttempts: validPositiveInt,
        },
    );
};

/**
 * Builds the email configuration. Production refuses the fake provider.
 * @returns The email configuration.
 */
export default (): EmailConfig => {
    const provider = process.env.EMAIL_PROVIDER as EmailProviderName;

    return buildConfig<EmailConfig>(
        {
            provider,
            ses: provider === EmailProviderName.SES ? sesConfig() : null,
            guideUrl: process.env.AUTHENTICATE_USERS_GUIDE_URL || "https://docs.auth.near.org/home/guides/authenticate-users",
        },
        {
            guideUrl: validHttpsUrl,
            provider: validOneOf(getConfigEnv() === "production" ? [EmailProviderName.SES] : Object.values(EmailProviderName)),
        },
    );
};
