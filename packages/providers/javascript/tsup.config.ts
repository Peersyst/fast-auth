import { defineConfig } from "tsup";

export default defineConfig({
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: { compilerOptions: { paths: { "@shared/core": ["../../shared/core/src/index.ts"] } } },
    clean: true,
    sourcemap: true,
    splitting: false,
    bundle: true,
    noExternal: ["@shared/core"],
});
