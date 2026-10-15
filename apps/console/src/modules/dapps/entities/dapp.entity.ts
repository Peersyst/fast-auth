import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import type { Auth0ClientId, Dapp, DappId, SyncedFields } from "../../../domain/dapp";
import { DappStatus, MauBracket } from "../../../domain/dapp";

@Entity("dapps")
@Check("dapps_pending_change_at", `("pending_change" IS NULL) = ("pending_change_at" IS NULL)`)
@Index("dapps_owner_email_live", ["ownerEmail"], { unique: true, where: "\"status\" <> 'removed'" })
export class DappEntity implements Dapp {
    @PrimaryGeneratedColumn("uuid")
    id: DappId;

    @Column({ name: "owner_email", type: "citext" })
    ownerEmail: string;

    @Column({ type: "text" })
    name: string;

    @Column({ type: "text" })
    description: string;

    @Column({ name: "logo_url", type: "text" })
    logoUrl: string;

    @Column({ name: "mau_bracket", type: "enum", enum: Object.values(MauBracket) })
    mauBracket: MauBracket;

    @Column({ name: "callback_urls", type: "text", array: true })
    callbackUrls: string[];

    @Column({ name: "logout_urls", type: "text", array: true })
    logoutUrls: string[];

    @Column({ name: "web_origins", type: "text", array: true })
    webOrigins: string[];

    @Column({ name: "contact_email", type: "citext" })
    contactEmail: string;

    @Column({ type: "enum", enum: Object.values(DappStatus) })
    status: DappStatus;

    @Column({ name: "rejection_reason", type: "text", nullable: true })
    rejectionReason: string | null;

    @Column({ name: "pending_change", type: "jsonb", nullable: true })
    pendingChange: SyncedFields | null;

    @Column({ name: "pending_change_at", type: "timestamptz", nullable: true })
    pendingChangeAt: Date | null;

    @Column({ name: "auth0_client_id", type: "text", nullable: true })
    auth0ClientId: Auth0ClientId | null;

    @Column({ name: "auth0_synced_at", type: "timestamptz", nullable: true })
    auth0SyncedAt: Date | null;

    @Column({ name: "auth0_error", type: "text", nullable: true })
    auth0Error: string | null;

    @Column({ name: "submitted_at", type: "timestamptz" })
    submittedAt: Date;

    @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
    reviewedAt: Date | null;

    @Column({ name: "reviewed_by", type: "citext", nullable: true })
    reviewedBy: string | null;

    @Column({ name: "removed_at", type: "timestamptz", nullable: true })
    removedAt: Date | null;

    @Column({ name: "removed_by", type: "citext", nullable: true })
    removedBy: string | null;

    @Column({ name: "removal_reason", type: "text", nullable: true })
    removalReason: string | null;

    @VersionColumn()
    version: number;

    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
    updatedAt: Date;
}
