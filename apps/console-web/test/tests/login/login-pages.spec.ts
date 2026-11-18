import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loginPages } from "../../../vite-plugins/login-pages";

const root = resolve(__dirname, "../../..");

const outDirs: string[] = [];

/**
 * Runs the plugin's build hooks the way Vite does, against a fresh output directory.
 * @param network The NEAR_NETWORK of the build.
 * @returns The output directory.
 */
function build(network: string | undefined): string {
    const outDir = mkdtempSync(join(tmpdir(), "console-web-dist-"));
    outDirs.push(outDir);
    const plugin = loginPages(network) as any;
    plugin.configResolved({ root, build: { outDir } });
    plugin.closeBundle();
    return outDir;
}

describe("loginPages build gating", () => {
    afterAll(() => outDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

    it("should copy the login pages into dist/login on a testnet build", () => {
        const outDir = build("testnet");
        for (const file of [
            "authorize.js",
            "callback.js",
            "login.js",
            "banner.css",
            "testnet/index.html",
            "testnet/callback.html",
            "testnet/config.json",
            "mainnet-testing/index.html",
            "mainnet-testing/callback.html",
            "mainnet-testing/config.json",
        ]) {
            expect(existsSync(join(outDir, "login", file))).toBe(true);
        }
    });

    it.each(["mainnet", undefined])("should ship no login pages on a %s build", (network) => {
        const outDir = build(network);
        expect(existsSync(join(outDir, "login"))).toBe(false);
    });
});
