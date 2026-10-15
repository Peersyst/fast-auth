import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("setting_events")
export class SettingEventEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "text" })
    key: string;

    @Column({ name: "old_value", type: "jsonb" })
    oldValue: Record<string, unknown>;

    @Column({ name: "new_value", type: "jsonb" })
    newValue: Record<string, unknown>;

    @Column({ name: "actor_email", type: "citext" })
    actorEmail: string;

    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt: Date;
}
