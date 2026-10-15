import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("settings")
export class SettingEntity {
    @PrimaryColumn({ type: "text" })
    key: string;

    @Column({ type: "jsonb" })
    value: Record<string, unknown>;
}
