import { causeChain } from "../modules/common/exception/cause-chain";

/**
 * Runs a script's main, and on failure prints the error's cause chain and exits the process.
 * @param name The script name that prefixes the failure line.
 * @param main The script body.
 * @param failureExitCode The exit code on failure.
 */
export function runScript(name: string, main: () => Promise<void>, failureExitCode = 1): void {
    main().catch((error: unknown) => {
        process.stderr.write(`${name} failed: ${causeChain(error)}\n`);
        process.exit(failureExitCode);
    });
}
