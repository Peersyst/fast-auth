/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MeDto = {
    properties: {
        email: {
            type: 'string',
            isRequired: true,
        },
        role: {
            type: 'all-of',
            contains: [{
                type: 'Role',
            }],
            isRequired: true,
        },
        emailVerified: {
            type: 'boolean',
            isRequired: true,
        },
    },
} as const;
