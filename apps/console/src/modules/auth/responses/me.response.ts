import { ApiProperty } from "@nestjs/swagger";
import type { SessionUser } from "../session-user";
import { Role } from "../session-user";

export class MeResponse {
    @ApiProperty()
    email: string;

    @ApiProperty({ enum: Object.values(Role), enumName: "Role" })
    role: Role;

    @ApiProperty()
    emailVerified: boolean;

    /**
     * Exposes the session user without its Auth0 subject.
     * @param user The session user.
     * @returns The response.
     */
    static fromUser(user: SessionUser): MeResponse {
        return { email: user.email, role: user.role, emailVerified: user.emailVerified };
    }
}
