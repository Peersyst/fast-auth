import { ApiProperty } from "@nestjs/swagger";
import { Role, SessionUser } from "../types/session-user";

export class MeDto {
    @ApiProperty()
    email: string;

    @ApiProperty({ enum: Role, enumName: "Role" })
    role: Role;

    @ApiProperty()
    emailVerified: boolean;

    /**
     * Exposes the session user without its Auth0 subject.
     * @param user The session user.
     * @returns The response.
     */
    static fromUser(user: SessionUser): MeDto {
        return { email: user.email, role: user.role, emailVerified: user.emailVerified };
    }
}
