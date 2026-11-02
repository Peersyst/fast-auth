import { isUUID } from "class-validator";
import { DataSource } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { loadConfig } from "../config";
import { dataSourceOptions } from "../database/data-source";
import type { DappId } from "@shared/console-domain/dapp";
import { DappStatus } from "@shared/console-domain/dapp";
import { DappEventEntity } from "../modules/dapps/entities/dapp-event.entity";
import { DappEntity } from "../modules/dapps/entities/dapp.entity";
import type { Anonymisation } from "./anonymisation";
import { anonymise } from "./anonymisation";
import { runScript } from "./run-script";

type AnonymiseResult = Omit<Anonymisation, "dapp" | "events"> & { events: number };

/**
 * Erases the personal data of one removed dApp and its events in one transaction, holding a row lock on the dApp.
 * @param dataSource The database connection.
 * @param dappId The dApp to anonymise.
 * @returns What was erased, and how many events the dApp has.
 */
export function runAnonymise(dataSource: DataSource, dappId: DappId): Promise<AnonymiseResult> {
    return dataSource.transaction(async (manager) => {
        const dapp = await manager.findOne(DappEntity, { where: { id: dappId }, lock: { mode: "pessimistic_write" } });
        if (dapp === null) throw new Error(`dApp ${dappId} not found`);
        if (dapp.status !== DappStatus.REMOVED) throw new Error(`dApp ${dappId} is ${dapp.status}: only a removed dApp can be anonymised`);
        const events = await manager.find(DappEventEntity, { where: { dappId }, order: { seq: "ASC" } });
        const { dapp: dappChanges, events: eventChanges, ...counts } = anonymise(dapp, events);
        if (Object.keys(dappChanges).length > 0) await manager.update(DappEntity, { id: dappId }, dappChanges);
        for (const { id, changes } of eventChanges) {
            // `details` is free-form jsonb, which TypeORM's deep-partial type cannot express.
            await manager.update(DappEventEntity, { id }, changes as QueryDeepPartialEntity<DappEventEntity>);
        }
        return { ...counts, events: events.length };
    });
}

const USAGE = "Usage: node dist/scripts/anonymise.js <dappId>";

/**
 * Reads the single dApp id argument.
 * @param args The command-line arguments after the script path.
 * @returns The id, or null unless the arguments are exactly one uuid.
 */
export function parseDappId(args: readonly string[]): DappId | null {
    const [dappId, ...extra] = args;
    return dappId !== undefined && extra.length === 0 && isUUID(dappId) ? (dappId as DappId) : null;
}

/**
 * Lists property names as their snake_case column names.
 * @param columns The property names.
 * @returns The column names joined with commas, or "none".
 */
const columnList = (columns: readonly string[]): string =>
    columns.map((column) => column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)).join(", ") || "none";

/**
 * Parses the arguments, anonymises the dApp and prints what it erased.
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const dappId = parseDappId(args);
    if (dappId === null) {
        const help = args.length === 1 && args[0] === "--help";
        (help ? process.stdout : process.stderr).write(`${USAGE}\n`);
        process.exitCode = help ? 0 : 1;
        return;
    }
    const dataSource = await new DataSource(dataSourceOptions(loadConfig())).initialize();
    try {
        const result = await runAnonymise(dataSource, dappId);
        process.stdout.write(
            [
                `Anonymised dApp ${dappId}:`,
                `  dApp columns erased: ${columnList(result.erasedColumns)}`,
                `  dApp columns with an email address erased from their text: ${columnList(result.scrubbedColumns)}`,
                `  events: ${result.events}; actor_email erased on ${result.erasedActors}; details changed on ${result.scrubbedDetails}`,
                "",
            ].join("\n"),
        );
    } finally {
        await dataSource.destroy();
    }
}

if (require.main === module) runScript("anonymise", main);
