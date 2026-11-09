import { ApiProperty } from "@nestjs/swagger";
import { Dapp } from "@database/console/entities";
import { DappStatus, MauBracket } from "@shared/modules/dapp";

export class SyncedFieldsDto {
    @ApiProperty()
    name: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    logoUrl: string;

    @ApiProperty({ type: [String] })
    callbackUrls: string[];

    @ApiProperty({ type: [String] })
    logoutUrls: string[];

    @ApiProperty({ type: [String] })
    webOrigins: string[];
}

export class OwnerDappDto {
    @ApiProperty({ format: "uuid" })
    id: string;

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

    @ApiProperty({ type: SyncedFieldsDto, nullable: true })
    pendingChange: SyncedFieldsDto | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    pendingChangeAt: string | null;

    @ApiProperty({ type: String, nullable: true, description: "Null until the dApp is provisioned." })
    auth0ClientId: string | null;

    @ApiProperty({ type: "integer", description: "Send it back as `expectedVersion` with the next change." })
    version: number;

    @ApiProperty({ format: "date-time" })
    submittedAt: string;

    /**
     * Maps a dApp to the owner's view, with dates as ISO strings and without the admin-only fields.
     * @param dapp The dApp.
     * @returns The owner's view.
     */
    static fromEntity(dapp: Dapp): OwnerDappDto {
        return {
            id: dapp.id,
            name: dapp.name,
            description: dapp.description,
            logoUrl: dapp.logoUrl,
            mauBracket: dapp.mauBracket,
            callbackUrls: dapp.callbackUrls,
            logoutUrls: dapp.logoutUrls,
            webOrigins: dapp.webOrigins,
            contactEmail: dapp.contactEmail,
            status: dapp.status,
            pendingChange: dapp.pendingChange,
            pendingChangeAt: dapp.pendingChangeAt?.toISOString() ?? null,
            auth0ClientId: dapp.auth0ClientId,
            version: dapp.version,
            submittedAt: dapp.submittedAt.toISOString(),
        };
    }
}

export class MyDappDto {
    @ApiProperty({ type: OwnerDappDto, nullable: true })
    dapp: OwnerDappDto | null;

    /**
     * Wraps the caller's dApp, or null when they have none.
     * @param dapp The caller's live dApp, or null.
     * @returns The response.
     */
    static fromEntity(dapp: Dapp | null): MyDappDto {
        return { dapp: dapp && OwnerDappDto.fromEntity(dapp) };
    }
}
