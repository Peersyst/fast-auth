/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminDappDto } from '../models/AdminDappDto';
import type { DappEventDto } from '../models/DappEventDto';
import type { DappOrderBy } from '../models/DappOrderBy';
import type { DappStatus } from '../models/DappStatus';
import type { ExpectedVersionRequest } from '../models/ExpectedVersionRequest';
import type { OrderType } from '../models/OrderType';
import type { PaginatedDappsDto } from '../models/PaginatedDappsDto';
import type { UpdateDappRequest } from '../models/UpdateDappRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminApi {
    /**
     * @param page
     * @param pageSize
     * @param order
     * @param orderBy
     * @param needsReview Only pending dApps and approved dApps with a pending change. Unless `orderBy` is given, they are sorted by how long they have waited for review, oldest first with `order=asc`.
     * @param status
     * @param search Case-insensitive substring of the name, owner email, contact email or Auth0 client id.
     * @returns PaginatedDappsDto
     * @throws ApiError
     */
    public static list(
        page: number = 1,
        pageSize: number = 20,
        order?: OrderType,
        orderBy?: DappOrderBy,
        needsReview: boolean = false,
        status?: DappStatus,
        search?: string,
    ): CancelablePromise<PaginatedDappsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/admin/dapps',
            query: {
                'page': page,
                'pageSize': pageSize,
                'order': order,
                'orderBy': orderBy,
                'needsReview': needsReview,
                'status': status,
                'search': search,
            },
        });
    }
    /**
     * @param id
     * @returns AdminDappDto
     * @throws ApiError
     */
    public static get(
        id: string,
    ): CancelablePromise<AdminDappDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/admin/dapps/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns AdminDappDto
     * @throws ApiError
     */
    public static edit(
        id: string,
        requestBody: UpdateDappRequest,
    ): CancelablePromise<AdminDappDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/console/admin/dapps/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns AdminDappDto
     * @throws ApiError
     */
    public static approve(
        id: string,
        requestBody: ExpectedVersionRequest,
    ): CancelablePromise<AdminDappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/admin/dapps/{id}/approve',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns AdminDappDto
     * @throws ApiError
     */
    public static reject(
        id: string,
        requestBody: ExpectedVersionRequest,
    ): CancelablePromise<AdminDappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/admin/dapps/{id}/reject',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns AdminDappDto
     * @throws ApiError
     */
    public static approveChange(
        id: string,
        requestBody: ExpectedVersionRequest,
    ): CancelablePromise<AdminDappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/admin/dapps/{id}/change/approve',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns AdminDappDto
     * @throws ApiError
     */
    public static rejectChange(
        id: string,
        requestBody: ExpectedVersionRequest,
    ): CancelablePromise<AdminDappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/admin/dapps/{id}/change/reject',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns AdminDappDto
     * @throws ApiError
     */
    public static remove(
        id: string,
        requestBody: ExpectedVersionRequest,
    ): CancelablePromise<AdminDappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/admin/dapps/{id}/remove',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns DappEventDto
     * @throws ApiError
     */
    public static listEvents(
        id: string,
    ): CancelablePromise<Array<DappEventDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/admin/dapps/{id}/events',
            path: {
                'id': id,
            },
        });
    }
}
