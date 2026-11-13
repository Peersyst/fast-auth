/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateDappRequest = {
    properties: {
        name: {
            type: 'string',
            description: `The dApp's name.`,
            isRequired: true,
        },
        description: {
            type: 'string',
            description: `A short description of the dApp.`,
            isRequired: true,
        },
        logoUrl: {
            type: 'string',
            description: `The URL of the dApp's logo.`,
            isRequired: true,
        },
        mauBracket: {
            type: 'all-of',
            description: `The expected monthly active users.`,
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
            description: `The email address to contact the dApp's team.`,
            isRequired: true,
        },
    },
} as const;
