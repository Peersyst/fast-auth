/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PaginatedDappsDto = {
    properties: {
        pages: {
            type: 'number',
            isRequired: true,
        },
        currentPage: {
            type: 'number',
            isRequired: true,
        },
        items: {
            type: 'array',
            contains: {
                type: 'AdminDappDto',
            },
            isRequired: true,
        },
        totalItems: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
