import { defineConfig as tsupDefineConfig, Options as TsupOptions } from "tsup";
export type Options = Omit<TsupOptions, "onSuccess" | "splitting" | "bundle" | "clean"> & {
    onSuccess?: Exclude<TsupOptions["onSuccess"], string>;
};
export declare function defineConfig({ dts, onSuccess, ...restOptions }: Options): ReturnType<typeof tsupDefineConfig>;
