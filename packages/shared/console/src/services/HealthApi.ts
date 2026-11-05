/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthApi {
    /**
     * Liveness probe endpoint.
     * Returns 200 OK to indicate the application is running.
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
     * Readiness probe endpoint.
     * Checks that the app is not shutting down and that the database answers before returning success.
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
