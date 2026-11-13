/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DappChangeDto = {
    description: `An edit of an approved dApp waiting for review. A null field is one the edit leaves as it is.`,
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        name: {
            type: 'string',
            isRequired: true,
            isNullable: true,
        },
        description: {
            type: 'string',
            isRequired: true,
            isNullable: true,
        },
        logoUrl: {
            type: 'string',
            isRequired: true,
            isNullable: true,
        },
        mauBracket: {
            type: 'Enum',
            isRequired: true,
            isNullable: true,
        },
        callbackUrls: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
            isNullable: true,
        },
        logoutUrls: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
            isNullable: true,
        },
        webOrigins: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
            isNullable: true,
        },
        contactEmail: {
            type: 'string',
            isRequired: true,
            isNullable: true,
        },
        createdAt: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
