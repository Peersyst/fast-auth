import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import type { DappFields } from "../../../domain/dapp";
import { MauBracket } from "../../../domain/dapp";
import type { UrlListField } from "../../../domain/field-rules";
import { DESCRIPTION_MAX_LENGTH, LOGO_URL_MAX_LENGTH, NAME_MAX_LENGTH, URL_LIST_RULES } from "../../../domain/field-rules";
import {
    IsContactEmail,
    IsDappDescription,
    IsDappName,
    IsLogoUrl,
    IsUrlList,
    NormaliseUrl,
    NormaliseUrlList,
    Trim,
} from "./dapp-field.decorators";
import { ExpectedVersionRequest } from "./expected-version.request";

const urlCount = (field: UrlListField): string => `${URL_LIST_RULES[field].min}–${URL_LIST_RULES[field].max}`;

export class UpsertDappRequest {
    @ApiProperty({
        description: `1–${NAME_MAX_LENGTH} UTF-16 code units once trimmed (most emoji count as two or more), no \`<\` or \`>\`.`,
    })
    @Trim()
    @IsDappName()
    name: string;

    @ApiProperty({ description: `At most ${DESCRIPTION_MAX_LENGTH} UTF-16 code units once trimmed; may be empty.` })
    @Trim()
    @IsDappDescription()
    description: string;

    @ApiProperty({ description: `An \`https:\` URL of at most ${LOGO_URL_MAX_LENGTH} characters.` })
    @NormaliseUrl()
    @IsLogoUrl()
    logoUrl: string;

    @ApiProperty({ enum: Object.values(MauBracket), enumName: "MauBracket" })
    @IsIn(Object.values(MauBracket))
    mauBracket: MauBracket;

    @ApiProperty({ type: [String], description: `${urlCount("callbackUrls")} absolute \`https:\` URLs once de-duplicated.` })
    @NormaliseUrlList()
    @IsUrlList("callbackUrls")
    callbackUrls: string[];

    @ApiProperty({ type: [String], description: `${urlCount("logoutUrls")} absolute \`https:\` URLs once de-duplicated.` })
    @NormaliseUrlList()
    @IsUrlList("logoutUrls")
    logoutUrls: string[];

    @ApiProperty({ type: [String], description: `${urlCount("webOrigins")} \`https://host[:port]\` origins once de-duplicated.` })
    @NormaliseUrlList()
    @IsUrlList("webOrigins")
    webOrigins: string[];

    @ApiProperty()
    @Trim()
    @IsContactEmail()
    contactEmail: string;
}

export class UpdateDappRequest extends IntersectionType(UpsertDappRequest, ExpectedVersionRequest) {}

export function toDappFields(request: UpsertDappRequest): DappFields {
    const { name, description, logoUrl, mauBracket, callbackUrls, logoutUrls, webOrigins, contactEmail } = request;
    return { name, description, logoUrl, mauBracket, callbackUrls, logoutUrls, webOrigins, contactEmail };
}
