import { ApiProperty } from "@nestjs/swagger";
import { Dapp } from "@database/console/entities";
import { DappStatus, MauBracket } from "@shared/modules/dapp";

export class DappDto {
    @ApiProperty({ format: "uuid" })
    id: string;

    @ApiProperty()
    ownerEmail: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    logoUrl: string;

    @ApiProperty({ enum: MauBracket, enumName: "MauBracket" })
    mauBracket: MauBracket;

    @ApiProperty({ type: [String] })
    callbackUrls: string[];

    @ApiProperty({ type: [String] })
    logoutUrls: string[];

    @ApiProperty({ type: [String] })
    webOrigins: string[];

    @ApiProperty()
    contactEmail: string;

    @ApiProperty({ enum: DappStatus, enumName: "DappStatus" })
    status: DappStatus;

    @ApiProperty({ type: String, nullable: true, description: "Null until the dApp is approved." })
    auth0ClientId: string | null;

    @ApiProperty({
        type: String,
        format: "date-time",
        nullable: true,
        description: "Null until an admin reviews the dApp.",
    })
    reviewedAt: string | null;

    @ApiProperty({ format: "date-time" })
    createdAt: string;

    /**
     * Maps a dApp to its response, with dates as ISO strings.
     * @param dapp The dApp.
     * @returns The response.
     */
    static fromEntity(dapp: Dapp): DappDto {
        return {
            id: dapp.id,
            ownerEmail: dapp.ownerEmail,
            name: dapp.name,
            description: dapp.description,
            logoUrl: dapp.logoUrl,
            mauBracket: dapp.mauBracket,
            callbackUrls: dapp.callbackUrls,
            logoutUrls: dapp.logoutUrls,
            webOrigins: dapp.webOrigins,
            contactEmail: dapp.contactEmail,
            status: dapp.status,
            auth0ClientId: dapp.auth0ClientId,
            reviewedAt: dapp.reviewedAt?.toISOString() ?? null,
            createdAt: dapp.createdAt.toISOString(),
        };
    }
}
