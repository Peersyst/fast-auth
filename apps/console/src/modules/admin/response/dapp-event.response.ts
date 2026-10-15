import type { Type } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { ActorRole, DappEventType } from "@shared/console-domain/dapp-event";
import type { DappEventPayloads } from "@shared/console-domain/dapp-event";
import type { StoredDappEvent } from "../../dapps/repositories/dapp-events.repository";
import {
    Auth0DeletedDetails,
    Auth0FailedDetails,
    Auth0WriteDetails,
    EmailFailedDetails,
    EmailSentDetails,
    FieldChangesDetails,
    NoDetails,
    ReasonDetails,
    RemovedDetails,
    SubmittedDetails,
} from "./dapp-event-details.response";

// Distributes over the union, where a plain Omit would merge every type's details into one.
type WithIsoCreatedAt<E> = E extends StoredDappEvent ? Omit<E, "createdAt"> & { createdAt: string } : never;

export type DappEventResponse = WithIsoCreatedAt<StoredDappEvent>;

// `never` unless A and B name the same fields, which catches the fields that assignability lets through: one the docs
// class keeps after the payload drops it, and an optional one the payload adds.
type SameKeys<A, B> = [Exclude<keyof A & string, keyof B> | Exclude<keyof B & string, keyof A>] extends [never] ? unknown : never;

// One schema per group of event types that share a details schema, so `type` tells the client which details it gets.
function dappEventSchema<T extends DappEventType, D extends Type<DappEventPayloads[T]>>(
    types: T[],
    details: D & SameKeys<InstanceType<D>, DappEventPayloads[T]>,
) {
    class DappEventSchema {
        @ApiProperty({ format: "uuid" })
        id: string;

        @ApiProperty({ enum: types })
        type: T;

        @ApiProperty({ type: String, nullable: true, description: "Null for the system." })
        actorEmail: string | null;

        @ApiProperty({ enum: Object.values(ActorRole), enumName: "ActorRole" })
        actorRole: ActorRole;

        @ApiProperty({ type: details })
        details: DappEventPayloads[T];

        @ApiProperty({ format: "date-time" })
        createdAt: string;
    }
    return DappEventSchema;
}

class SubmittedEvent extends dappEventSchema([DappEventType.SUBMITTED], SubmittedDetails) {}
class FieldChangesEvent extends dappEventSchema(
    [DappEventType.EDITED, DappEventType.CHANGE_REQUESTED, DappEventType.CHANGE_APPROVED],
    FieldChangesDetails,
) {}
class NoDetailsEvent extends dappEventSchema(
    [
        DappEventType.RESUBMITTED,
        DappEventType.APPROVED,
        DappEventType.AUTO_APPROVED,
        DappEventType.CHANGE_WITHDRAWN,
        DappEventType.OWNER_CHANGED,
    ],
    NoDetails,
) {}
class ReasonEvent extends dappEventSchema([DappEventType.REJECTED, DappEventType.CHANGE_REJECTED], ReasonDetails) {}
class RemovedEvent extends dappEventSchema([DappEventType.REMOVED], RemovedDetails) {}
class Auth0WriteEvent extends dappEventSchema([DappEventType.AUTH0_CREATED, DappEventType.AUTH0_UPDATED], Auth0WriteDetails) {}
class Auth0DeletedEvent extends dappEventSchema([DappEventType.AUTH0_DELETED], Auth0DeletedDetails) {}
class Auth0FailedEvent extends dappEventSchema([DappEventType.AUTH0_FAILED], Auth0FailedDetails) {}
class EmailSentEvent extends dappEventSchema([DappEventType.EMAIL_SENT], EmailSentDetails) {}
class EmailFailedEvent extends dappEventSchema([DappEventType.EMAIL_FAILED], EmailFailedDetails) {}

export const DAPP_EVENT_SCHEMAS = [
    SubmittedEvent,
    FieldChangesEvent,
    NoDetailsEvent,
    ReasonEvent,
    RemovedEvent,
    Auth0WriteEvent,
    Auth0DeletedEvent,
    Auth0FailedEvent,
    EmailSentEvent,
    EmailFailedEvent,
];

export function toDappEventResponse({ createdAt, ...event }: StoredDappEvent): DappEventResponse {
    return { ...event, createdAt: createdAt.toISOString() };
}
