/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClientConfigDto } from '../models/ClientConfigDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConfigApi {
    /**
     * @returns ClientConfigDto
     * @throws ApiError
     */
    public static getConfig(): CancelablePromise<ClientConfigDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/config',
        });
    }
}
