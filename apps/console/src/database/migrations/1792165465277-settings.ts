import { MigrationInterface, QueryRunner } from "typeorm";

export class Settings1792165465277 implements MigrationInterface {
    name = 'Settings1792165465277'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "setting_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" text NOT NULL, "old_value" jsonb NOT NULL, "new_value" jsonb NOT NULL, "actor_email" citext NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c553826095f2845eebecb65492b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "settings" ("key" text NOT NULL, "value" jsonb NOT NULL, CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`);
        await queryRunner.query(`INSERT INTO "settings" ("key", "value") VALUES ('auto_approval', '{"enabled": false}')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP TABLE "setting_events"`);
    }

}
