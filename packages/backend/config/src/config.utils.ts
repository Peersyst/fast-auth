import { ConfigEnvs } from "./config-envs";

type ArrayElement<ArrayType extends readonly any[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export type ConfigEnvType = ArrayElement<typeof ConfigEnvs>;

export type ConfigKey<T> = T | Partial<Record<ConfigEnvType | "default", T>>;

export type ConfigKeys<T> = { [P in keyof T]: ConfigKey<T[P]> };

export type ConfigValidators<T> = Partial<Record<keyof T, (value: any) => boolean>>;

/**
 * Get the config environment.
 * @returns The config environment.
 */
export function getConfigEnv(): ConfigEnvType {
    const env: any = process.env.CONFIG_ENV || process.env.NODE_ENV || "development";
    if (ConfigEnvs.indexOf(env) === -1) throw new Error("Invalid env value " + env);
    return env;
}

/**
 * Build the config.
 * @param config The config.
 * @param validators The validators.
 * @returns The config.
 */
export function buildConfig<T>(config: ConfigKeys<T>, validators: ConfigValidators<T> = {}): T {
    const configEnv = getConfigEnv();
    const keys = Object.keys(config) as (keyof T)[];

    const result = keys.reduce((acc: Partial<T>, key: keyof T) => {
        const value = config[key];
        const isObject = typeof value === "object" && value !== null;
        const isConfigObject = isObject && ("default" in value || ConfigEnvs.some((env) => env in value));

        if (isConfigObject) {
            const envValue = (value as Partial<Record<ConfigEnvType | "default", T[keyof T]>>)[configEnv];
            acc[key] = envValue !== undefined ? envValue : (value as Partial<Record<ConfigEnvType | "default", T[keyof T]>>)["default"];
        } else {
            acc[key] = value as T[keyof T];
        }

        return acc;
    }, {}) as T;

    for (const key in result) {
        if (validators[key] && !validators[key]!(result[key]))
            throw new Error(`Error validating config param ${key} with value ${result[key]}`);
    }

    return result;
}
