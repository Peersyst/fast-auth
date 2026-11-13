/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateDappRequest } from '../models/CreateDappRequest';
import type { DappDto } from '../models/DappDto';
import type { PaginatedDappsDto } from '../models/PaginatedDappsDto';
import type { UpdateDappRequest } from '../models/UpdateDappRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DappApi {
    /**
     * @param page
     * @param pageSize
     * @returns PaginatedDappsDto For an admin, one page of every dApp. For anyone else, their own dApp, if any.
     * @throws ApiError
     */
    public static list(
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<PaginatedDappsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/dapp',
            query: {
                'page': page,
                'pageSize': pageSize,
            },
        });
    }
    /**
     * @param requestBody
     * @returns DappDto The new dApp, `pending` until an admin reviews it, or `approved` with its Auth0 client when auto-approval is on.
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
     * @param requestBody
     * @returns DappDto The dApp. A pending dApp is edited in place. An approved dApp shows the edit in `pendingChange` until it is reviewed.
     * @throws ApiError
     */
    public static update(
        id: string,
        requestBody: UpdateDappRequest,
    ): CancelablePromise<DappDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/console/dapp/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns DappDto The dApp, `approved` with its new Auth0 client.
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
    /**
     * @param id
     * @returns DappDto The dApp with the change applied.
     * @throws ApiError
     */
    public static approveChange(
        id: string,
    ): CancelablePromise<DappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/dapp/{id}/change/approve',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns DappDto The dApp, with no pending change.
     * @throws ApiError
     */
    public static rejectChange(
        id: string,
    ): CancelablePromise<DappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/dapp/{id}/change/reject',
            path: {
                'id': id,
            },
        });
    }
}
