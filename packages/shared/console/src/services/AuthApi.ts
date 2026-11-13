/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MeDto } from '../models/MeDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthApi {
    /**
     * @returns MeDto
     * @throws ApiError
     */
    public static me(): CancelablePromise<MeDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/me',
        });
    }
}
