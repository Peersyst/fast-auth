/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthApi {
    /**
     * @returns any
     * @throws ApiError
     */
    public static livez(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/livez',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static readyz(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/readyz',
        });
    }
}
