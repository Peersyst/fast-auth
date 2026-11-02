import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoApprovalIndexes1793089366844 implements MigrationInterface {
    name = 'AutoApprovalIndexes1793089366844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "dapp_events_created_at_submitted" ON "dapp_events" ("created_at") WHERE "type" = 'submitted'`);
        await queryRunner.query(`CREATE INDEX "dapp_events_actor_email_user" ON "dapp_events" ("actor_email") WHERE "actor_role" = 'user'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."dapp_events_actor_email_user"`);
        await queryRunner.query(`DROP INDEX "public"."dapp_events_created_at_submitted"`);
    }

}
