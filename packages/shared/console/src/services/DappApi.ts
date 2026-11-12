/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateDappRequest } from '../models/CreateDappRequest';
import type { DappDto } from '../models/DappDto';
import type { DappOrderBy } from '../models/DappOrderBy';
import type { DappStatus } from '../models/DappStatus';
import type { OrderType } from '../models/OrderType';
import type { PaginatedDappsDto } from '../models/PaginatedDappsDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DappApi {
    /**
     * @param page
     * @param pageSize
     * @param order
     * @param orderBy
     * @param needsReview Only dApps waiting for review, which are the pending ones. Unless `orderBy` is given, they are sorted by how long they have waited, oldest first with `order=ASC`.
     * @param status
     * @param search Case-insensitive substring of the name, owner email, contact email or Auth0 client id.
     * @returns PaginatedDappsDto For an admin, one page of the dApps that match the filters. For anyone else, their own live dApp, if any.
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
            url: '/api/console/dapp',
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
     * @param requestBody
     * @returns DappDto The new dApp. Its status is `pending` until it is reviewed, or `approved` with an Auth0 client when auto-approval approved it.
     * @throws ApiError
     */
    public static create(
        requestBody: CreateDappRequest,
    ): CancelablePromise<DappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/dapp',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns DappDto The dApp. An admin can read any dApp, anyone else only their own.
     * @throws ApiError
     */
    public static get(
        id: string,
    ): CancelablePromise<DappDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/dapp/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns DappDto The dApp, `approved` with its new Auth0 client, or still `pending` with `auth0Error` when the Auth0 call failed.
     * @throws ApiError
     */
    public static approve(
        id: string,
    ): CancelablePromise<DappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/dapp/{id}/approve',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns DappDto The dApp, `rejected`.
     * @throws ApiError
     */
    public static reject(
        id: string,
    ): CancelablePromise<DappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/dapp/{id}/reject',
            path: {
                'id': id,
            },
        });
    }
}
