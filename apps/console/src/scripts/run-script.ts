import { causeChain } from "../modules/common/exception/cause-chain";

export function runScript(name: string, main: () => Promise<void>, failureExitCode = 1): void {
    main().catch((error: unknown) => {
        process.stderr.write(`${name} failed: ${causeChain(error)}\n`);
        process.exit(failureExitCode);
    });
}
