import { defineConfig } from "./src";

export default defineConfig({
    outDir: "build",
    entry: ["src/**/*.ts"],
    format: ["esm", "cjs"],
    dts: true,
});
