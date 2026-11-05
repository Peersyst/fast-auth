import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ActorRole, DappEventType } from "@shared/modules/dapp";
import { Dapp } from "./dapp";

@Entity("dapp_event")
@Index("dapp_event_dapp_id_seq", ["dappId", "seq"])
@Index("dapp_event_actor_email_user", ["actorEmail"], { where: `"actor_role" = '${ActorRole.USER}'` })
@Index("dapp_event_created_at_submitted", ["createdAt"], { where: `"type" = '${DappEventType.SUBMITTED}'` })
export class DappEvent {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /** Orders a dApp's events, since several share one created_at inside a transaction. */
    @Column({ type: "bigint", generated: "identity", generatedIdentity: "ALWAYS" })
    seq: string;

    @ManyToOne(() => Dapp, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "dapp_id" })
    dapp?: Dapp;

    @Column("uuid", { name: "dapp_id" })
    dappId: string;

    @Column({ type: "enum", enum: DappEventType })
    type: DappEventType;

    @Column("citext", { name: "actor_email", nullable: true })
    actorEmail: string | null;

    @Column({ type: "enum", enum: ActorRole, name: "actor_role" })
    actorRole: ActorRole;

    @Column("jsonb")
    details: Record<string, unknown>;

    @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
    createdAt: Date;
}
