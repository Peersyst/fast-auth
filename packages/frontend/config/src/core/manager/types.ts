export type MinRequiredVersionConfig = {
    /**
     * The minimum required version the provider config is compatible with.
     */
    minRequiredVersion?: number;
};

export type BaseProviderConfig = MinRequiredVersionConfig;

export type BaseConfig = BaseProviderConfig & {
    /**
     * Version of the config.
     */
    version: number;
};
