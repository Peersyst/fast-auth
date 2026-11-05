/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MyDappDto = {
    properties: {
        dapp: {
            type: 'all-of',
            contains: [{
                type: 'OwnerDappDto',
            }],
            isRequired: true,
            isNullable: true,
        },
    },
} as const;
