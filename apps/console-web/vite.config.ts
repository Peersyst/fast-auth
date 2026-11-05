import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Only BACKEND_URL reaches the bundle, so no other build variable ends up in the served JavaScript.
    const env = loadEnv(mode, process.cwd(), "BACKEND_URL");

    return {
        plugins: [react(), tailwindcss()],
        define: {
            "process.env": env,
        },
        build: {
            target: "es2022",
        },
        server: {
            port: 3001,
            proxy: { "/api": "http://localhost:3000" },
        },
    };
});
