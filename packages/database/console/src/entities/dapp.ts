import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { DappFields, DappStatus, MauBracket, SyncedFields } from "@shared/modules/dapp";

export const OWNER_EMAIL_LIVE_INDEX = "dapp_owner_email_live";

@Entity("dapp")
@Check("dapp_pending_change_at", `("pending_change" IS NULL) = ("pending_change_at" IS NULL)`)
@Index(OWNER_EMAIL_LIVE_INDEX, ["ownerEmail"], { unique: true, where: `"status" <> '${DappStatus.REMOVED}'` })
export class Dapp implements DappFields {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column("citext", { name: "owner_email" })
    ownerEmail: string;

    @Column("text")
    name: string;

    @Column("text")
    description: string;

    @Column("text", { name: "logo_url" })
    logoUrl: string;

    @Column({ type: "enum", enum: MauBracket, name: "mau_bracket" })
    mauBracket: MauBracket;

    @Column("text", { name: "callback_urls", array: true })
    callbackUrls: string[];

    @Column("text", { name: "logout_urls", array: true })
    logoutUrls: string[];

    @Column("text", { name: "web_origins", array: true })
    webOrigins: string[];

    @Column("citext", { name: "contact_email" })
    contactEmail: string;

    @Column({ type: "enum", enum: DappStatus })
    status: DappStatus;

    @Column("jsonb", { name: "pending_change", nullable: true })
    pendingChange: SyncedFields | null;

    @Column("timestamp with time zone", { name: "pending_change_at", nullable: true })
    pendingChangeAt: Date | null;

    @Column("text", { name: "auth0_client_id", nullable: true })
    auth0ClientId: string | null;

    @Column("text", { name: "auth0_error", nullable: true })
    auth0Error: string | null;

    @Column("timestamp with time zone", { name: "submitted_at" })
    submittedAt: Date;

    @Column("timestamp with time zone", { name: "reviewed_at", nullable: true })
    reviewedAt: Date | null;

    @Column("timestamp with time zone", { name: "removed_at", nullable: true })
    removedAt: Date | null;

    @VersionColumn()
    version: number;

    @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
    updatedAt: Date;
}
