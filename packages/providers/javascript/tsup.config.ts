import { defineConfig } from "tsup";

export default defineConfig({
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: { resolve: ["@shared/core"] },
    clean: true,
    sourcemap: true,
    splitting: false,
    bundle: true,
    noExternal: ["@shared/core"],
});
