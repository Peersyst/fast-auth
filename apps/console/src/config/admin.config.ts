import { buildConfig, validEmail } from "@backend/config";

export interface AdminConfig {
    /** Lowercased. An admin also needs a verified email. */
    emails: string[];
}

/**
 * Builds the admin configuration from the comma-separated ADMIN_EMAILS.
 * @returns The admin configuration.
 */
export default (): AdminConfig => {
    return buildConfig<AdminConfig>(
        {
            emails: (process.env.ADMIN_EMAILS ?? "")
                .split(",")
                .map((email) => email.trim().toLowerCase())
                .filter((email) => email !== ""),
        },
        { emails: (emails: string[]) => emails.length > 0 && emails.every(validEmail) },
    );
};
