import path from "node:path";
import { getPnpmWorkspaceMembers } from "./get-pnpm-workspace-members.mjs";

/**
 * Get the paths of the packages in the workspace.
 * @returns The paths of the packages in the workspace.
 */
export function getPackagesPaths() {
    const workspaceMembers = getPnpmWorkspaceMembers();

    return workspaceMembers.reduce((acc, m) => {
        const p = path.relative(process.cwd(), m.path);
        if (Boolean(p) && p.startsWith("packages/")) {
            acc.push(p);
        }
        return acc;
    }, []);
}
