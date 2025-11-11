import { execSync } from "node:child_process";

/**
 * Get the members of the pnpm workspace.
 * @returns The members of the pnpm workspace.
 */
export function getPnpmWorkspaceMembers() {
    return JSON.parse(execSync("pnpm m ls --json --depth=-1").toString());
}
