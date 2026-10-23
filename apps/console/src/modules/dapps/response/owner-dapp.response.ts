import type { ApiPropertyOptions } from "@nestjs/swagger";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import type { Dapp } from "../../../domain/dapp";
import { DappStatus, MauBracket } from "../../../domain/dapp";

// OpenAPI 3.0 has no null type, and `nullable` beside a `$ref` still requires the referenced object, so null gets its own branch.
function nullableModel(model: string): ApiPropertyOptions {
    return { anyOf: [{ $ref: model }, { type: "object", nullable: true, enum: [null] }] };
}

export class SyncedFieldsResponse {
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

@ApiExtraModels(SyncedFieldsResponse)
export class OwnerDappResponse {
    @ApiProperty({ format: "uuid" })
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    logoUrl: string;

    @ApiProperty({ enum: Object.values(MauBracket), enumName: "MauBracket" })
    mauBracket: MauBracket;

    @ApiProperty({ type: [String] })
    callbackUrls: string[];

    @ApiProperty({ type: [String] })
    logoutUrls: string[];

    @ApiProperty({ type: [String] })
    webOrigins: string[];

    @ApiProperty()
    contactEmail: string;

    @ApiProperty({ enum: Object.values(DappStatus), enumName: "DappStatus" })
    status: DappStatus;

    @ApiProperty({ type: String, nullable: true })
    rejectionReason: string | null;

    @ApiProperty(nullableModel(getSchemaPath(SyncedFieldsResponse)))
    pendingChange: SyncedFieldsResponse | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    pendingChangeAt: string | null;

    @ApiProperty({ type: String, nullable: true, description: "Null until the dApp is provisioned." })
    auth0ClientId: string | null;

    @ApiProperty({ type: "integer", description: "Send it back as `expectedVersion` with the next change." })
    version: number;

    @ApiProperty({ format: "date-time" })
    submittedAt: string;
}

@ApiExtraModels(OwnerDappResponse)
export class MyDappResponse {
    @ApiProperty(nullableModel(getSchemaPath(OwnerDappResponse)))
    dapp: OwnerDappResponse | null;
}

export function toOwnerDappResponse(dapp: Dapp): OwnerDappResponse {
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
        rejectionReason: dapp.rejectionReason,
        pendingChange: dapp.pendingChange,
        pendingChangeAt: dapp.pendingChangeAt?.toISOString() ?? null,
        auth0ClientId: dapp.auth0ClientId,
        version: dapp.version,
        submittedAt: dapp.submittedAt.toISOString(),
    };
}
