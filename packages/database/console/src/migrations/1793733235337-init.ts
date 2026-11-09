import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1793733235337 implements MigrationInterface {
    name = "Init1793733235337";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_mau_bracket_enum" AS ENUM('lt1k', '1k_10k', '10k_25k', 'gt25k')`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_status_enum" AS ENUM('pending', 'approved', 'rejected', 'removed')`);
        await queryRunner.query(
            `CREATE TABLE "dapp" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_email" citext NOT NULL, "name" text NOT NULL, "description" text NOT NULL, "logo_url" text NOT NULL, "mau_bracket" "public"."dapp_mau_bracket_enum" NOT NULL, "callback_urls" text array NOT NULL, "logout_urls" text array NOT NULL, "web_origins" text array NOT NULL, "contact_email" citext NOT NULL, "status" "public"."dapp_status_enum" NOT NULL, "pending_change" jsonb, "pending_change_at" TIMESTAMP WITH TIME ZONE, "auth0_client_id" text, "auth0_error" text, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "reviewed_at" TIMESTAMP WITH TIME ZONE, "removed_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "dapp_pending_change_at" CHECK (("pending_change" IS NULL) = ("pending_change_at" IS NULL)), CONSTRAINT "PK_0ae9da012097f3d50d780776fda" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "dapp_owner_email_live" ON "dapp" ("owner_email") WHERE "status" <> 'removed'`);
        await queryRunner.query(
            `CREATE TYPE "public"."dapp_event_type_enum" AS ENUM('submitted', 'edited', 'resubmitted', 'approved', 'auto_approved', 'rejected', 'change_requested', 'change_withdrawn', 'change_approved', 'change_rejected', 'removed', 'auth0_created', 'auth0_updated', 'auth0_deleted', 'auth0_failed')`,
        );
        await queryRunner.query(`CREATE TYPE "public"."dapp_event_actor_role_enum" AS ENUM('user', 'admin', 'system')`);
        await queryRunner.query(
            `CREATE TABLE "dapp_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "dapp_id" uuid NOT NULL, "type" "public"."dapp_event_type_enum" NOT NULL, "actor_role" "public"."dapp_event_actor_role_enum" NOT NULL, "details" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f301667159bb004cd1aee0b17a8" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE INDEX "dapp_event_dapp_id_seq" ON "dapp_event" ("dapp_id", "seq") `);
        await queryRunner.query(
            `ALTER TABLE "dapp_event" ADD CONSTRAINT "FK_9e5905f3a0f489a0d5cd3761dbc" FOREIGN KEY ("dapp_id") REFERENCES "dapp"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dapp_event" DROP CONSTRAINT "FK_9e5905f3a0f489a0d5cd3761dbc"`);
        await queryRunner.query(`DROP INDEX "public"."dapp_event_dapp_id_seq"`);
        await queryRunner.query(`DROP TABLE "dapp_event"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_event_actor_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_event_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."dapp_owner_email_live"`);
        await queryRunner.query(`DROP TABLE "dapp"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_mau_bracket_enum"`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS citext`);
    }
}
