/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActorRole } from './ActorRole';
import type { DappEventType } from './DappEventType';
export type DappEventDto = {
    id: string;
    type: DappEventType;
    actorRole: ActorRole;
    /**
     * The details the event's type records.
     */
    details: Record<string, any>;
    createdAt: string;
};

