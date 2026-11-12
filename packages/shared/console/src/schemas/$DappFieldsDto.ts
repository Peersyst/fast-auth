/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DappFieldsDto = {
    properties: {
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
        mauBracket: {
            type: 'all-of',
            contains: [{
                type: 'MauBracket',
            }],
            isRequired: true,
        },
    },
} as const;
