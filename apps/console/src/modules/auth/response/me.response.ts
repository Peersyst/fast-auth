import { ApiProperty } from "@nestjs/swagger";
import { Role } from "../session-user";

export class MeResponse {
    @ApiProperty()
    email: string;

    @ApiProperty({ enum: Object.values(Role), enumName: "Role" })
    role: Role;

    @ApiProperty()
    emailVerified: boolean;
}
