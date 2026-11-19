import { cpSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

/**
 * Copies the open login pages from `login/` into `<outDir>/login/`, for the testnet (staging) build only.
 * They are static files that nginx serves next to the app, so a production build must not ship them.
 * @param network The NEAR_NETWORK the build is for.
 * @returns The Vite plugin.
 */
export function loginPages(network: string | undefined): Plugin {
    let root = "";
    let outDir = "";
    return {
        name: "login-pages",
        apply: "build",
        configResolved(config) {
            root = config.root;
            outDir = resolve(config.root, config.build.outDir);
        },
        closeBundle() {
            if (network === "testnet") cpSync(join(root, "login"), join(outDir, "login"), { recursive: true });
        },
    };
}
