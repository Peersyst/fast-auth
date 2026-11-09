import { buildConfig, validEmail } from "@backend/config";

export interface AdminConfig {
    /** Lowercased. An admin also needs a verified email. */
    emails: string[];
    /** The auto-approval switch at startup. Admins change it at runtime. */
    autoApprovalEnabled: boolean;
}

/**
 * Builds the admin configuration from the comma-separated ADMIN_EMAILS and AUTO_APPROVAL_ENABLED.
 * @returns The admin configuration.
 */
export default (): AdminConfig => {
    return buildConfig<AdminConfig>(
        {
            emails: (process.env.ADMIN_EMAILS ?? "")
                .split(",")
                .map((email) => email.trim().toLowerCase())
                .filter((email) => email !== ""),
            autoApprovalEnabled: process.env.AUTO_APPROVAL_ENABLED === "true",
        },
        { emails: (emails: string[]) => emails.length > 0 && emails.every(validEmail) },
    );
};
