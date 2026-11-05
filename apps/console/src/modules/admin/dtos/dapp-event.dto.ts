import { ApiProperty } from "@nestjs/swagger";
import { DappEvent } from "@database/console/entities";
import { ActorRole, DappEventType } from "@shared/modules/dapp";

export class DappEventDto {
    @ApiProperty({ format: "uuid" })
    id: string;

    @ApiProperty({ enum: DappEventType, enumName: "DappEventType" })
    type: DappEventType;

    @ApiProperty({ type: String, nullable: true, description: "Null for the system." })
    actorEmail: string | null;

    @ApiProperty({ enum: ActorRole, enumName: "ActorRole" })
    actorRole: ActorRole;

    @ApiProperty({ type: "object", additionalProperties: true, description: "The details the event's type records." })
    details: Record<string, unknown>;

    @ApiProperty({ format: "date-time" })
    createdAt: string;

    /**
     * Maps a stored event to the response, with its creation time as an ISO string.
     * @param event The stored event.
     * @returns The response.
     */
    static fromEntity(event: DappEvent): DappEventDto {
        const { id, type, details, actorEmail, actorRole, createdAt } = event;
        return { id, type, details, actorEmail, actorRole, createdAt: createdAt.toISOString() };
    }
}
