/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpdateDappRequest = {
    properties: {
        name: {
            type: 'string',
            description: `The dApp's name.`,
        },
        description: {
            type: 'string',
            description: `A short description of the dApp.`,
        },
        logoUrl: {
            type: 'string',
            description: `The URL of the dApp's logo.`,
        },
        mauBracket: {
            type: 'all-of',
            description: `The expected monthly active users.`,
            contains: [{
                type: 'MauBracket',
            }],
        },
        callbackUrls: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        logoutUrls: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        webOrigins: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        contactEmail: {
            type: 'string',
            description: `The email address to contact the dApp's team.`,
        },
    },
} as const;
