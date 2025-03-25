import { defineConfig } from "@shared/tsup";

export default defineConfig({
    entry: ["src/**/*.ts"],
    format: ["esm", "cjs"],
    dts: true,
});
