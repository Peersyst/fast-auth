import type { ApiPropertyOptions } from "@nestjs/swagger";
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { DAPP_FIELDS } from "../../../domain/dapp";
import type { Auth0ClientId, DappField } from "../../../domain/dapp";
import { Auth0Op, EmailTemplate } from "../../../domain/dapp-event";
import type { FieldValue } from "../../../domain/dapp-event";
import { SyncedFieldsResponse } from "../../dapps/response/owner-dapp.response";

const FIELD_VALUE: ApiPropertyOptions = { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] };
const EMAIL_TEMPLATE: ApiPropertyOptions = { enum: Object.values(EmailTemplate), enumName: "EmailTemplate" };

class FieldValueChange {
    @ApiProperty({ enum: DAPP_FIELDS.filter((field) => field !== "contactEmail") })
    field: Exclude<DappField, "contactEmail">;

    @ApiProperty(FIELD_VALUE)
    before: FieldValue;

    @ApiProperty(FIELD_VALUE)
    after: FieldValue;
}

class ContactEmailChange {
    @ApiProperty({ enum: ["contactEmail"], description: "The contact email changed. Its values are not logged." })
    field: "contactEmail";
}

@ApiExtraModels(FieldValueChange, ContactEmailChange)
export class FieldChangesDetails {
    @ApiProperty({
        type: "array",
        items: { oneOf: [{ $ref: getSchemaPath(FieldValueChange) }, { $ref: getSchemaPath(ContactEmailChange) }] },
    })
    changes: (FieldValueChange | ContactEmailChange)[];
}

export class SubmittedDetails {
    @ApiProperty()
    chosenForAutoApproval: boolean;
}

export class ReasonDetails {
    @ApiProperty()
    reason: string;
}

export class RemovedDetails {
    @ApiPropertyOptional()
    reason?: string;
}

export class Auth0WriteDetails {
    @ApiProperty()
    clientId: Auth0ClientId;

    @ApiProperty({ type: SyncedFieldsResponse, description: "The synced fields sent to Auth0." })
    payload: SyncedFieldsResponse;
}

export class Auth0DeletedDetails {
    @ApiProperty()
    clientId: Auth0ClientId;
}

export class Auth0FailedDetails {
    @ApiProperty({ enum: Object.values(Auth0Op), enumName: "Auth0Op" })
    op: Auth0Op;

    @ApiProperty()
    error: string;

    @ApiPropertyOptional()
    clientId?: Auth0ClientId;
}

export class EmailSentDetails {
    @ApiProperty(EMAIL_TEMPLATE)
    template: EmailTemplate;
}

export class EmailFailedDetails {
    @ApiProperty(EMAIL_TEMPLATE)
    template: EmailTemplate;

    @ApiProperty()
    error: string;
}

export class NoDetails {
    [key: string]: never;
}
