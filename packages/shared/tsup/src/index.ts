/* eslint-disable no-console */
import { defineConfig as tsupDefineConfig, Options as TsupOptions } from "tsup";
import { execSync } from "child_process";

export type Options = Omit<TsupOptions, "onSuccess" | "splitting" | "bundle" | "clean"> & {
    onSuccess?: Exclude<TsupOptions["onSuccess"], string>;
};

/**
 * `tsup.defineConfig` wrapper to build declaration files.
 * @param config The tsup config.
 * @returns The tsup config.
 */
export function defineConfig({ dts = false, onSuccess, ...restOptions }: Options): ReturnType<typeof tsupDefineConfig> {
    return {
        ...restOptions,
        dts: false,
        splitting: false,
        bundle: false,
        clean: true,
        async onSuccess() {
            if (dts) {
                console.log("\x1b[34m%s\x1b[0m", "TSC", "Building declaration files...");
                try {
                    execSync("npx tsc --project ./tsconfig.build.json --emitDeclarationOnly --declaration");
                } catch (e) {
                    console.error("\x1b[31m%s\x1b[0m", "TSC", (e as any).stdout.toString());
                    process.exit(1);
                }
                console.log("\x1b[34m%s\x1b[0m", "TSC", "⚡️ Build success");
            }
            return onSuccess?.();
        },
    };
}
