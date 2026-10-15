import type { EntityManager, QueryRunner } from "typeorm";
import { DataSource } from "typeorm";
import { loadConfig } from "../src/config";
import { dataSourceOptions } from "../src/database/data-source";
import type { DappId } from "../src/domain/dapp";
import { syncedFieldsOf } from "../src/domain/dapp";
import { DappEventEntity } from "../src/modules/dapps/entities/dapp-event.entity";
import { DappEntity } from "../src/modules/dapps/entities/dapp.entity";
import { makeDapp } from "./utils/dapp";

const SECOND_ID = "0b8e7f6a-5d4c-4b3a-9f8e-7d6c5b4a3f2e" as DappId;

describe("dApp tables", () => {
    let dataSource: DataSource;
    let queryRunner: QueryRunner;
    let manager: EntityManager;

    beforeAll(async () => {
        dataSource = await new DataSource(dataSourceOptions(loadConfig())).initialize();
    });

    beforeEach(async () => {
        queryRunner = dataSource.createQueryRunner();
        await queryRunner.startTransaction();
        manager = queryRunner.manager;
    });

    afterEach(async () => {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    it("refuses a second live dApp for the same owner email in different letter case", async () => {
        await manager.insert(DappEntity, makeDapp());

        await expect(manager.insert(DappEntity, makeDapp({ id: SECOND_ID, ownerEmail: "OWNER@Acme.example" }))).rejects.toMatchObject({
            code: "23505",
            constraint: "dapps_owner_email_live",
        });
    });

    it("lets the owner register again once the first dApp is removed", async () => {
        const first = makeDapp();
        await manager.insert(DappEntity, first);
        await manager.update(DappEntity, { id: first.id }, { status: "removed" });

        await manager.insert(DappEntity, makeDapp({ id: SECOND_ID }));

        expect(await manager.countBy(DappEntity, { ownerEmail: "owner@acme.example" })).toBe(2);
    });

    it("bumps the version from 1 to 2 on update", async () => {
        const dapp = makeDapp();
        await manager.insert(DappEntity, dapp);

        await manager.update(DappEntity, { id: dapp.id }, { name: "Acme Wallet 2" });

        expect(await manager.findOneByOrFail(DappEntity, { id: dapp.id })).toMatchObject({ name: "Acme Wallet 2", version: 2 });
    });

    it("refuses to delete a dApp that has an event", async () => {
        const dapp = makeDapp();
        await manager.insert(DappEntity, dapp);
        await manager.insert(DappEventEntity, {
            dappId: dapp.id,
            type: "submitted",
            actorEmail: dapp.ownerEmail,
            actorRole: "user",
            details: {},
        });

        await expect(manager.delete(DappEntity, { id: dapp.id })).rejects.toMatchObject({ code: "23503" });
    });

    it("refuses a pending change without its timestamp", async () => {
        const dapp = makeDapp();

        await expect(
            manager.insert(DappEntity, { ...dapp, pendingChange: syncedFieldsOf(dapp), pendingChangeAt: null }),
        ).rejects.toMatchObject({
            code: "23514",
            constraint: "dapps_pending_change_at",
        });
    });
});
