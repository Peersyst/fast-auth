export enum ConfigEnv {
    DEVELOPMENT = "development",
    TEST = "test",
    STAGING = "staging",
    PRODUCTION = "production",
}

export enum NearNetwork {
    TESTNET = "testnet",
    MAINNET = "mainnet",
}

export enum Auth0ProvisionerName {
    MANAGEMENT = "management",
    FAKE = "fake",
}

export enum EmailProviderName {
    SES = "ses",
    FAKE = "fake",
}

export enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    HTTP = "http",
    VERBOSE = "verbose",
    DEBUG = "debug",
    SILLY = "silly",
}

export type ConsoleConfig = {
    readonly server: {
        readonly env: ConfigEnv;
        readonly port: number;
        readonly publicUrl: string;
        readonly metricsPort: number;
        readonly readyzTimeoutMs: number;
        readonly shutdownDelayMs: number;
    };
    readonly logger: {
        readonly level: LogLevel;
        readonly file: string | null;
    };
    readonly database: {
        readonly host: string;
        readonly port: number;
        readonly name: string;
        readonly user: string;
        readonly password: string;
        readonly poolSize: number;
        readonly ssl: boolean;
        readonly connectTimeoutMs: number;
        readonly lockTimeoutMs: number;
    };
    readonly auth0: {
        readonly loginDomain: string;
        readonly consoleClientId: string;
        readonly nearNetwork: NearNetwork;
        readonly jwksTimeoutMs: number;
        readonly jwksRefetchCooldownMs: number;
        readonly healthCheckIntervalMs: number;
    } & (
        | {
              readonly provisioner: Auth0ProvisionerName.MANAGEMENT;
              readonly mgmtDomain: string;
              readonly m2mClientId: string;
              readonly m2mClientSecret: string;
              readonly templateClientId: string;
              readonly mgmtRetryAfterMs: number;
              readonly mgmtMaxRetryAfterMs: number;
              readonly mgmtTimeoutMs: number;
          }
        | { readonly provisioner: Auth0ProvisionerName.FAKE }
    );
    readonly email:
        | { readonly provider: EmailProviderName.SES; readonly from: string; readonly region: string }
        | { readonly provider: EmailProviderName.FAKE };
    readonly admin: {
        readonly emails: ReadonlySet<string>;
    };
    readonly throttle: {
        readonly submitDappPerMinute: number;
        readonly editDappPerMinute: number;
        readonly adminMutationPerMinute: number;
    };
    readonly slack: {
        readonly webhookUrl: string | null;
    };
};

export type ManagementAuth0Config = Extract<ConsoleConfig["auth0"], { provisioner: Auth0ProvisionerName.MANAGEMENT }>;
export type SesEmailConfig = Extract<ConsoleConfig["email"], { provider: EmailProviderName.SES }>;
