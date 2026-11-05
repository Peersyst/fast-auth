import { Column, Entity, PrimaryColumn } from "typeorm";

export const AUTO_APPROVAL_SETTING = "auto_approval";

@Entity("setting")
export class Setting {
    @PrimaryColumn("text")
    key: string;

    @Column("jsonb")
    value: Record<string, unknown>;
}
