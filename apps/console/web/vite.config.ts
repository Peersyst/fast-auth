import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: { "/api/console": "http://localhost:3000" },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
    },
});
