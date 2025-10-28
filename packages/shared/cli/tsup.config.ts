import { defineConfig } from "@shared/tsup";

export default defineConfig({
    entry: ["src/**/*.mjs"],
    format: ["esm"],
});
