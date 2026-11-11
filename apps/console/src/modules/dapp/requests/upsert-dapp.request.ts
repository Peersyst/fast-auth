import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IsEmail, IsIn } from "class-validator";
import { DappFields, MauBracket } from "@shared/modules/dapp";
import {
    IsDappDescription,
    IsDappName,
    IsLogoUrl,
    IsUrlList,
    NormaliseUrl,
    NormaliseUrlList,
    Trim,
} from "../decorator/dapp-field.decorator";
import { ExpectedVersionRequest } from "./expected-version.request";

export class UpsertDappRequest {
    @ApiProperty({ description: "The dApp's name." })
    @Trim()
    @IsDappName()
    name: string;

    @ApiProperty({ description: "A short description of the dApp." })
    @Trim()
    @IsDappDescription()
    description: string;

    @ApiProperty({ description: "The URL of the dApp's logo." })
    @NormaliseUrl()
    @IsLogoUrl()
    logoUrl: string;

    @ApiProperty({ enum: MauBracket, enumName: "MauBracket", description: "The expected monthly active users." })
    @IsIn(Object.values(MauBracket))
    mauBracket: MauBracket;

    @ApiProperty({ type: [String], description: "The URLs Auth0 may redirect to after login." })
    @NormaliseUrlList()
    @IsUrlList("callbackUrls")
    callbackUrls: string[];

    @ApiProperty({ type: [String], description: "The URLs Auth0 may redirect to after logout." })
    @NormaliseUrlList()
    @IsUrlList("logoutUrls")
    logoutUrls: string[];

    @ApiProperty({ type: [String], description: "The origins allowed to sign in from the browser." })
    @NormaliseUrlList()
    @IsUrlList("webOrigins")
    webOrigins: string[];

    @ApiProperty({ description: "The email address to contact the dApp's team." })
    @Trim()
    @IsEmail()
    contactEmail: string;
}

export class UpdateDappRequest extends IntersectionType(UpsertDappRequest, ExpectedVersionRequest) {}

/**
 * Keeps only the dApp fields of a request, dropping expectedVersion and anything else.
 * @param request The validated request.
 * @returns The fields.
 */
export function toDappFields(request: UpsertDappRequest): DappFields {
    const { name, description, logoUrl, mauBracket, callbackUrls, logoutUrls, webOrigins, contactEmail } = request;
    return { name, description, logoUrl, mauBracket, callbackUrls, logoutUrls, webOrigins, contactEmail };
}
