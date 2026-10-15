export const ConfigEnv = {
    Development: "development",
    Test: "test",
    Staging: "staging",
    Production: "production",
} as const;
export type ConfigEnv = (typeof ConfigEnv)[keyof typeof ConfigEnv];

export const NEAR_NETWORKS = ["testnet", "mainnet"] as const;
export type NearNetwork = (typeof NEAR_NETWORKS)[number];

export const AUTH0_PROVISIONERS = ["management", "fake"] as const;
export type Auth0ProvisionerName = (typeof AUTH0_PROVISIONERS)[number];

export const EMAIL_PROVIDERS = ["ses", "fake"] as const;
export type EmailProviderName = (typeof EMAIL_PROVIDERS)[number];

export type ConsoleConfig = {
    readonly server: {
        readonly env: ConfigEnv;
        readonly port: number;
        readonly publicUrl: string;
    };
    readonly database: {
        readonly host: string;
        readonly port: number;
        readonly name: string;
        readonly user: string;
        readonly password: string;
        readonly poolSize: number;
        readonly ssl: boolean;
        readonly lockTimeoutMs: number;
    };
    readonly auth0: {
        readonly loginDomain: string;
        readonly consoleClientId: string;
        readonly nearNetwork: NearNetwork;
    } & (
        | {
              readonly provisioner: "management";
              readonly mgmtDomain: string;
              readonly m2mClientId: string;
              readonly m2mClientSecret: string;
              readonly templateClientId: string;
          }
        | { readonly provisioner: "fake" }
    );
    readonly email: { readonly provider: "ses"; readonly from: string; readonly region: string } | { readonly provider: "fake" };
    readonly admin: {
        readonly emails: ReadonlySet<string>;
    };
    readonly slack: {
        readonly webhookUrl: string | null;
    };
};

export type ManagementAuth0Config = Extract<ConsoleConfig["auth0"], { provisioner: "management" }>;
export type SesEmailConfig = Extract<ConsoleConfig["email"], { provider: "ses" }>;

export const CONSOLE_CONFIG = Symbol("CONSOLE_CONFIG");
