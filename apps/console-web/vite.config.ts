import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Only these variables reach the bundle, so no other build variable ends up in the served JavaScript.
    const env = loadEnv(mode, process.cwd(), "");
    const appEnv = Object.fromEntries(
        ["BACKEND_URL", "AUTH0_LOGIN_DOMAIN", "AUTH0_CLIENT_ID", "NEAR_NETWORK"].map((key) => [key, env[key]]),
    );

    return {
        plugins: [react(), tailwindcss()],
        define: {
            "process.env": appEnv,
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
