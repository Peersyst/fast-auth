import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { DappFields, DappStatus, MauBracket } from "@shared/modules/dapp";

export const OWNER_EMAIL_LIVE_INDEX = "dapp_owner_email_live";

@Entity("dapp")
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

    @Column("text", { name: "auth0_client_id", nullable: true })
    auth0ClientId: string | null;

    @Column("text", { name: "auth0_error", nullable: true })
    auth0Error: string | null;

    @Column("timestamp with time zone", { name: "reviewed_at", nullable: true })
    reviewedAt: Date | null;

    @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
    updatedAt: Date;
}
