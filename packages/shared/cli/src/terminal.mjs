import { exec } from "node:child_process";

export function spawnMacOsTerm(command) {
    exec(`osascript -e 'tell application "Terminal" to do script "${command}"' -e 'tell application "Terminal" to activate'`);
}

export function spawnLinuxTerm(command) {
    exec(`gnome-terminal -- bash -c "${command}; exec bash"`);
}

export function spawnWindowsTerm(command) {
    exec(`start cmd.exe /K ${command}`);
}

export function spawnTerminal(command) {
    if (process.platform === "darwin") {
        spawnMacOsTerm(command);
    } else if (process.platform === "linux") {
        spawnLinuxTerm(command);
    } else if (process.platform === "win32") {
        spawnWindowsTerm(command);
    } else {
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
}
