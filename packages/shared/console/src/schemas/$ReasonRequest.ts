/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReasonRequest = {
    properties: {
        expectedVersion: {
            type: 'number',
            isRequired: true,
        },
        reason: {
            type: 'string',
            description: `10–2000 UTF-16 code units once trimmed (most emoji count as two or more).`,
            isRequired: true,
        },
    },
} as const;
