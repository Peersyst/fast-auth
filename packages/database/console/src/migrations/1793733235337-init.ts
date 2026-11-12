import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1793733235337 implements MigrationInterface {
    name = "Init1793733235337";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_mau_bracket_enum" AS ENUM('lt1k', '1k_10k', '10k_25k', 'gt25k')`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_status_enum" AS ENUM('pending', 'approved', 'rejected', 'removed')`);
        await queryRunner.query(
            `CREATE TABLE "dapp" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_email" citext NOT NULL, "name" text NOT NULL, "description" text NOT NULL, "logo_url" text NOT NULL, "mau_bracket" "public"."dapp_mau_bracket_enum" NOT NULL, "callback_urls" text array NOT NULL, "logout_urls" text array NOT NULL, "web_origins" text array NOT NULL, "contact_email" citext NOT NULL, "status" "public"."dapp_status_enum" NOT NULL, "auth0_client_id" text, "auth0_error" text, "reviewed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0ae9da012097f3d50d780776fda" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "dapp_owner_email_live" ON "dapp" ("owner_email") WHERE "status" <> 'removed'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."dapp_owner_email_live"`);
        await queryRunner.query(`DROP TABLE "dapp"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_mau_bracket_enum"`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS citext`);
    }
}
