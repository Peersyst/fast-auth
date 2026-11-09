/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DappEventDto = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        type: {
            type: 'all-of',
            contains: [{
                type: 'DappEventType',
            }],
            isRequired: true,
        },
        actorRole: {
            type: 'all-of',
            contains: [{
                type: 'ActorRole',
            }],
            isRequired: true,
        },
        details: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
            isRequired: true,
        },
        createdAt: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
