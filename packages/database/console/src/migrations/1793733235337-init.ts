import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1793733235337 implements MigrationInterface {
    name = "Init1793733235337";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_mau_bracket_enum" AS ENUM('lt1k', '1k_10k', '10k_25k', 'gt25k')`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_status_enum" AS ENUM('pending', 'approved', 'rejected', 'removed')`);
        await queryRunner.query(
            `CREATE TABLE "dapp" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_email" citext NOT NULL, "name" text NOT NULL, "description" text NOT NULL, "logo_url" text NOT NULL, "mau_bracket" "public"."dapp_mau_bracket_enum" NOT NULL, "callback_urls" text array NOT NULL, "logout_urls" text array NOT NULL, "web_origins" text array NOT NULL, "contact_email" citext NOT NULL, "status" "public"."dapp_status_enum" NOT NULL, "auth0_client_id" text, "reviewed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0ae9da012097f3d50d780776fda" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "dapp_owner_email_live" ON "dapp" ("owner_email") WHERE "status" <> 'removed'`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_change_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(
            `CREATE TABLE "dapp_change" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dapp_id" uuid NOT NULL, "name" text, "description" text, "logo_url" text, "mau_bracket" "public"."dapp_mau_bracket_enum", "callback_urls" text array, "logout_urls" text array, "web_origins" text array, "contact_email" citext, "status" "public"."dapp_change_status_enum" NOT NULL, "reviewed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_92f151502dff1b228db75044eb0" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE INDEX "dapp_change_dapp_id_created_at" ON "dapp_change" ("dapp_id", "created_at") `);
        await queryRunner.query(
            `ALTER TABLE "dapp_change" ADD CONSTRAINT "FK_92c4591df04e0c3ed5e9083e316" FOREIGN KEY ("dapp_id") REFERENCES "dapp"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dapp_change" DROP CONSTRAINT "FK_92c4591df04e0c3ed5e9083e316"`);
        await queryRunner.query(`DROP INDEX "public"."dapp_change_dapp_id_created_at"`);
        await queryRunner.query(`DROP TABLE "dapp_change"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_change_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."dapp_owner_email_live"`);
        await queryRunner.query(`DROP TABLE "dapp"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_mau_bracket_enum"`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS citext`);
    }
}
