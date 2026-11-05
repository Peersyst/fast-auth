/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MyDappDto } from '../models/MyDappDto';
import type { OwnerDappDto } from '../models/OwnerDappDto';
import type { UpdateDappRequest } from '../models/UpdateDappRequest';
import type { UpsertDappRequest } from '../models/UpsertDappRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DappApi {
    /**
     * @returns MyDappDto
     * @throws ApiError
     */
    public static getMine(): CancelablePromise<MyDappDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/dapp',
        });
    }
    /**
     * @param requestBody
     * @returns OwnerDappDto The new dApp. Its status is `pending` until an admin reviews it, or `approved` with an Auth0 client when auto-approval approved it.
     * @throws ApiError
     */
    public static submit(
        requestBody: UpsertDappRequest,
    ): CancelablePromise<OwnerDappDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/console/dapp',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns OwnerDappDto
     * @throws ApiError
     */
    public static edit(
        id: string,
        requestBody: UpdateDappRequest,
    ): CancelablePromise<OwnerDappDto> {
        return __request(OpenAPI, {
            method: 'PUT',
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
     * @param expectedVersion
     * @returns void
     * @throws ApiError
     */
    public static remove(
        id: string,
        expectedVersion: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/console/dapp/{id}',
            path: {
                'id': id,
            },
            query: {
                'expectedVersion': expectedVersion,
            },
        });
    }
}
