/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AutoApprovalSettingsDto = {
    properties: {
        enabled: {
            type: 'boolean',
            isRequired: true,
        },
        dailyCap: {
            type: 'number',
            description: `The most new submissions auto-approval chooses in any 24 hours.`,
            isRequired: true,
        },
    },
} as const;
