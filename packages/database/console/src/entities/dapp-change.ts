import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { DappChangeStatus, MauBracket } from "@shared/modules/dapp";
import { Dapp } from "./dapp";

/** An owner's edit of an approved dApp. Each field is null when the edit leaves it as it was. */
@Entity("dapp_change")
@Index("dapp_change_dapp_id_created_at", ["dappId", "createdAt"])
export class DappChange {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => Dapp, { onDelete: "CASCADE" })
    @JoinColumn({ name: "dapp_id" })
    dapp?: Dapp;

    @Column("uuid", { name: "dapp_id" })
    dappId: string;

    @Column("text", { nullable: true })
    name: string | null;

    @Column("text", { nullable: true })
    description: string | null;

    @Column("text", { name: "logo_url", nullable: true })
    logoUrl: string | null;

    // Shares the dapp table's enum type instead of creating a dapp_change one.
    @Column({ type: "enum", enum: MauBracket, enumName: "dapp_mau_bracket_enum", name: "mau_bracket", nullable: true })
    mauBracket: MauBracket | null;

    @Column("text", { name: "callback_urls", array: true, nullable: true })
    callbackUrls: string[] | null;

    @Column("text", { name: "logout_urls", array: true, nullable: true })
    logoutUrls: string[] | null;

    @Column("text", { name: "web_origins", array: true, nullable: true })
    webOrigins: string[] | null;

    @Column("citext", { name: "contact_email", nullable: true })
    contactEmail: string | null;

    @Column({ type: "enum", enum: DappChangeStatus })
    status: DappChangeStatus;

    @Column("timestamp with time zone", { name: "reviewed_at", nullable: true })
    reviewedAt: Date | null;

    @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
    updatedAt: Date;
}
