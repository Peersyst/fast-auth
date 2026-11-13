import { defineConfig } from "@shared/tsup";

export default defineConfig({
    entry: ["src/**/*"],
    format: ["esm", "cjs"],
    dts: true,
    esbuildOptions(options) {
        options.assetNames = "[dir]/[name]";
    },
    loader: {
        ".json": "file",
    },
});
