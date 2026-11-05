import { ApiProperty } from "@nestjs/swagger";
import { Dapp } from "@database/console/entities";
import { OwnerDappDto } from "../../dapp/dtos/owner-dapp.dto";

export class AdminDappDto extends OwnerDappDto {
    @ApiProperty()
    ownerEmail: string;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    reviewedAt: string | null;

    @ApiProperty({ type: String, nullable: true, description: "Null until an admin reviews it. Stays null after auto-approval." })
    reviewedBy: string | null;

    @ApiProperty({ type: String, nullable: true, description: "The last Auth0 error, cleared by the next successful Auth0 write." })
    auth0Error: string | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    auth0SyncedAt: string | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    removedAt: string | null;

    @ApiProperty({ type: String, nullable: true })
    removedBy: string | null;

    @ApiProperty({ type: String, nullable: true })
    removalReason: string | null;

    @ApiProperty({ format: "date-time" })
    createdAt: string;

    @ApiProperty({ format: "date-time" })
    updatedAt: string;

    /**
     * Maps a dApp to the admin view, which adds the owner, review, Auth0 and removal fields to the owner's view.
     * @param dapp The dApp.
     * @returns The admin view.
     */
    static override fromEntity(dapp: Dapp): AdminDappDto {
        return {
            ...OwnerDappDto.fromEntity(dapp),
            ownerEmail: dapp.ownerEmail,
            reviewedAt: dapp.reviewedAt?.toISOString() ?? null,
            reviewedBy: dapp.reviewedBy,
            auth0Error: dapp.auth0Error,
            auth0SyncedAt: dapp.auth0SyncedAt?.toISOString() ?? null,
            removedAt: dapp.removedAt?.toISOString() ?? null,
            removedBy: dapp.removedBy,
            removalReason: dapp.removalReason,
            createdAt: dapp.createdAt.toISOString(),
            updatedAt: dapp.updatedAt.toISOString(),
        };
    }
}
