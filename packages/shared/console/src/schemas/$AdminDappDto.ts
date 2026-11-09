/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AdminDappDto = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        description: {
            type: 'string',
            isRequired: true,
        },
        logoUrl: {
            type: 'string',
            isRequired: true,
        },
        mauBracket: {
            type: 'all-of',
            contains: [{
                type: 'MauBracket',
            }],
            isRequired: true,
        },
        callbackUrls: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        logoutUrls: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        webOrigins: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        contactEmail: {
            type: 'string',
            isRequired: true,
        },
        status: {
            type: 'all-of',
            contains: [{
                type: 'DappStatus',
            }],
            isRequired: true,
        },
        pendingChange: {
            type: 'all-of',
            contains: [{
                type: 'SyncedFieldsDto',
            }],
            isRequired: true,
            isNullable: true,
        },
        pendingChangeAt: {
            type: 'string',
            isRequired: true,
            isNullable: true,
            format: 'date-time',
        },
        auth0ClientId: {
            type: 'string',
            description: `Null until the dApp is provisioned.`,
            isRequired: true,
            isNullable: true,
        },
        version: {
            type: 'number',
            description: `Send it back as \`expectedVersion\` with the next change.`,
            isRequired: true,
        },
        submittedAt: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        ownerEmail: {
            type: 'string',
            isRequired: true,
        },
        reviewedAt: {
            type: 'string',
            isRequired: true,
            isNullable: true,
            format: 'date-time',
        },
        auth0Error: {
            type: 'string',
            description: `The last Auth0 error, cleared by the next successful Auth0 write.`,
            isRequired: true,
            isNullable: true,
        },
        removedAt: {
            type: 'string',
            isRequired: true,
            isNullable: true,
            format: 'date-time',
        },
        createdAt: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        updatedAt: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
