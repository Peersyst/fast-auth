import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { DappChange } from "@database/console/entities";
import { MauBracket } from "@shared/modules/dapp";

@ApiSchema({ description: "An edit of an approved dApp waiting for review. A null field is one the edit leaves as it is." })
export class DappChangeDto {
    @ApiProperty({ format: "uuid" })
    id: string;

    @ApiProperty({ type: String, nullable: true })
    name: string | null;

    @ApiProperty({ type: String, nullable: true })
    description: string | null;

    @ApiProperty({ type: String, nullable: true })
    logoUrl: string | null;

    @ApiProperty({ enum: MauBracket, nullable: true })
    mauBracket: MauBracket | null;

    @ApiProperty({ type: [String], nullable: true })
    callbackUrls: string[] | null;

    @ApiProperty({ type: [String], nullable: true })
    logoutUrls: string[] | null;

    @ApiProperty({ type: [String], nullable: true })
    webOrigins: string[] | null;

    @ApiProperty({ type: String, nullable: true })
    contactEmail: string | null;

    @ApiProperty({ format: "date-time" })
    createdAt: string;

    /**
     * Maps a change to its response, with dates as ISO strings.
     * @param change The change.
     * @returns The response.
     */
    static fromEntity(change: DappChange): DappChangeDto {
        return {
            id: change.id,
            name: change.name,
            description: change.description,
            logoUrl: change.logoUrl,
            mauBracket: change.mauBracket,
            callbackUrls: change.callbackUrls,
            logoutUrls: change.logoutUrls,
            webOrigins: change.webOrigins,
            contactEmail: change.contactEmail,
            createdAt: change.createdAt.toISOString(),
        };
    }
}
