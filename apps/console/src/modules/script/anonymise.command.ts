import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { isUUID } from "class-validator";
import { Command, Positional } from "nestjs-command";
import { DataSource } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { Dapp, DappEvent } from "@database/console/entities";
import { DappStatus } from "@shared/modules/dapp";
import { anonymise, Anonymisation } from "./anonymisation";

export type AnonymiseResult = Omit<Anonymisation, "dapp" | "events"> & { events: number };

/**
 * Lists property names as their snake_case column names.
 * @param columns The property names.
 * @returns The column names joined with commas, or "none".
 */
const columnList = (columns: readonly string[]): string =>
    columns.map((column) => column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)).join(", ") || "none";

@Injectable()
export class AnonymiseCommand {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    /**
     * Erases the personal data of one removed dApp and prints what it erased. Exits with 1 on a bad argument or a failure.
     * @param dappId The dApp to anonymise.
     */
    @Command({ command: "anonymise <dappId>", describe: "Erase the personal data of one removed dApp" })
    async run(@Positional({ name: "dappId", describe: "The removed dApp's id", type: "string" }) dappId: string): Promise<void> {
        if (!isUUID(dappId)) {
            process.stderr.write("Usage: node dist/src/cli.js anonymise <dappId>\n");
            process.exitCode = 1;
            return;
        }
        try {
            const result = await this.anonymise(dappId);
            process.stdout.write(
                [
                    `Anonymised dApp ${dappId}:`,
                    `  dApp columns erased: ${columnList(result.erasedColumns)}`,
                    `  dApp columns with an email address erased from their text: ${columnList(result.scrubbedColumns)}`,
                    `  events: ${result.events}; actor_email erased on ${result.erasedActors}; details changed on ${result.scrubbedDetails}`,
                    "",
                ].join("\n"),
            );
        } catch (error) {
            process.stderr.write(`anonymise failed: ${error instanceof Error ? error.message : String(error)}\n`);
            process.exitCode = 1;
        }
    }

    /**
     * Erases the personal data of one removed dApp and its events in one transaction, holding a row lock on the dApp.
     * @param dappId The dApp to anonymise.
     * @returns What was erased, and how many events the dApp has.
     */
    anonymise(dappId: string): Promise<AnonymiseResult> {
        return this.dataSource.transaction(async (manager) => {
            const dapp = await manager.findOne(Dapp, { where: { id: dappId }, lock: { mode: "pessimistic_write" } });
            if (dapp === null) throw new Error(`dApp ${dappId} not found`);
            if (dapp.status !== DappStatus.REMOVED)
                throw new Error(`dApp ${dappId} is ${dapp.status}: only a removed dApp can be anonymised`);
            const events = await manager.find(DappEvent, { where: { dappId }, order: { seq: "ASC" } });
            const { dapp: dappChanges, events: eventChanges, ...counts } = anonymise(dapp, events);
            if (Object.keys(dappChanges).length > 0) await manager.update(Dapp, { id: dappId }, dappChanges);
            for (const { id, changes } of eventChanges) {
                // `details` is free-form jsonb, which TypeORM's deep-partial type cannot express.
                await manager.update(DappEvent, { id }, changes as QueryDeepPartialEntity<DappEvent>);
            }
            return { ...counts, events: events.length };
        });
    }
}
