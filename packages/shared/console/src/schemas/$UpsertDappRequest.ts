/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpsertDappRequest = {
    properties: {
        name: {
            type: 'string',
            description: `1–64 UTF-16 code units once trimmed (most emoji count as two or more), no \`<\` or \`>\`.`,
            isRequired: true,
        },
        description: {
            type: 'string',
            description: `At most 140 UTF-16 code units once trimmed; may be empty.`,
            isRequired: true,
        },
        logoUrl: {
            type: 'string',
            description: `An \`https:\` URL of at most 255 characters.`,
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
    },
} as const;
