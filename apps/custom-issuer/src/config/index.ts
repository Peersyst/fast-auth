import issuerConfig, { IssuerConfig } from "./issuer.config";

export type Config = {
    issuer: IssuerConfig;
};

export default (): Config => {
    return {
        issuer: issuerConfig(),
    };
};
