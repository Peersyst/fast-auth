import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1791480114853 implements MigrationInterface {
    name = 'Init1791480114853'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);
        await queryRunner.query(`CREATE TYPE "public"."dapps_mau_bracket_enum" AS ENUM('lt1k', '1k_10k', '10k_25k', 'gt25k')`);
        await queryRunner.query(`CREATE TYPE "public"."dapps_status_enum" AS ENUM('pending', 'approved', 'rejected', 'removed')`);
        await queryRunner.query(`CREATE TABLE "dapps" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "owner_email" citext NOT NULL, "name" text NOT NULL, "description" text NOT NULL, "logo_url" text NOT NULL, "mau_bracket" "public"."dapps_mau_bracket_enum" NOT NULL, "callback_urls" text array NOT NULL, "logout_urls" text array NOT NULL, "web_origins" text array NOT NULL, "contact_email" citext NOT NULL, "status" "public"."dapps_status_enum" NOT NULL, "rejection_reason" text, "pending_change" jsonb, "pending_change_at" TIMESTAMP WITH TIME ZONE, "auth0_client_id" text, "auth0_synced_at" TIMESTAMP WITH TIME ZONE, "auth0_error" text, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "reviewed_at" TIMESTAMP WITH TIME ZONE, "reviewed_by" citext, "removed_at" TIMESTAMP WITH TIME ZONE, "removed_by" citext, "removal_reason" text, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "dapps_pending_change_at" CHECK (("pending_change" IS NULL) = ("pending_change_at" IS NULL)), CONSTRAINT "PK_93d4d9b713eec4e21cf607efbfd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "dapps_owner_email_live" ON "dapps" ("owner_email") WHERE "status" <> 'removed'`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_events_type_enum" AS ENUM('submitted', 'edited', 'resubmitted', 'approved', 'auto_approved', 'rejected', 'change_requested', 'change_withdrawn', 'change_approved', 'change_rejected', 'owner_changed', 'removed', 'auth0_created', 'auth0_updated', 'auth0_deleted', 'auth0_failed', 'email_sent', 'email_failed')`);
        await queryRunner.query(`CREATE TYPE "public"."dapp_events_actor_role_enum" AS ENUM('user', 'admin', 'system')`);
        await queryRunner.query(`CREATE TABLE "dapp_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "dapp_id" uuid NOT NULL, "type" "public"."dapp_events_type_enum" NOT NULL, "actor_email" citext, "actor_role" "public"."dapp_events_actor_role_enum" NOT NULL, "details" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6b14d57fda0fd2c91139cbb4078" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "dapp_events_dapp_id_seq" ON "dapp_events" ("dapp_id", "seq") `);
        await queryRunner.query(`ALTER TABLE "dapp_events" ADD CONSTRAINT "FK_16916c6f0b2bb003237944c8307" FOREIGN KEY ("dapp_id") REFERENCES "dapps"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dapp_events" DROP CONSTRAINT "FK_16916c6f0b2bb003237944c8307"`);
        await queryRunner.query(`DROP INDEX "public"."dapp_events_dapp_id_seq"`);
        await queryRunner.query(`DROP TABLE "dapp_events"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_events_actor_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."dapp_events_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."dapps_owner_email_live"`);
        await queryRunner.query(`DROP TABLE "dapps"`);
        await queryRunner.query(`DROP TYPE "public"."dapps_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."dapps_mau_bracket_enum"`);
    }

}
