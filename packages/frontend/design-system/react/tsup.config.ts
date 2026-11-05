import { copyFileSync, mkdirSync } from "fs";
import { defineConfig } from "@shared/tsup";

export default defineConfig({
    entry: ["src/**/*.ts", "src/**/*.tsx"],
    format: ["esm", "cjs"],
    dts: true,
    // The stylesheet holds Tailwind directives that only the app's Tailwind build resolves, so it ships as written.
    async onSuccess() {
        mkdirSync("dist/styles", { recursive: true });
        copyFileSync("src/styles/global.css", "dist/styles/global.css");
    },
});
