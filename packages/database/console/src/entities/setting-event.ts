import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("setting_event")
export class SettingEvent {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column("text")
    key: string;

    @Column("jsonb", { name: "old_value" })
    oldValue: Record<string, unknown>;

    @Column("jsonb", { name: "new_value" })
    newValue: Record<string, unknown>;

    @Column("citext", { name: "actor_email" })
    actorEmail: string;

    @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
    createdAt: Date;
}
