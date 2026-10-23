import { Column, CreateDateColumn, Entity, ForeignKey, Index, PrimaryGeneratedColumn } from "typeorm";
import type { DappId } from "../../../domain/dapp";
import { ActorRole, DappEventType } from "../../../domain/dapp-event";
import { DappEntity } from "./dapp.entity";

@Entity("dapp_events")
@Index("dapp_events_dapp_id_seq", ["dappId", "seq"])
export class DappEventEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "bigint", generated: "identity", generatedIdentity: "ALWAYS" })
    seq: string;

    @Column({ name: "dapp_id", type: "uuid" })
    @ForeignKey(() => DappEntity, { onDelete: "RESTRICT" })
    dappId: DappId;

    @Column({ type: "enum", enum: Object.values(DappEventType) })
    type: DappEventType;

    @Column({ name: "actor_email", type: "citext", nullable: true })
    actorEmail: string | null;

    @Column({ name: "actor_role", type: "enum", enum: Object.values(ActorRole) })
    actorRole: ActorRole;

    @Column({ type: "jsonb" })
    details: Record<string, unknown>;

    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt: Date;
}
