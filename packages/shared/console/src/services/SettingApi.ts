/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SettingsDto } from '../models/SettingsDto';
import type { UpdateSettingsRequest } from '../models/UpdateSettingsRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SettingApi {
    /**
     * @returns SettingsDto `autoApproval.enabled` says whether new submissions can be approved without an admin.
     * @throws ApiError
     */
    public static get(): CancelablePromise<SettingsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/console/admin/settings',
        });
    }
    /**
     * @param requestBody
     * @returns SettingsDto The settings after the change. Turning auto-approval on does not approve dApps already pending. Turning it off also leaves pending a chosen submission whose Auth0 calls have not started.
     * @throws ApiError
     */
    public static update(
        requestBody: UpdateSettingsRequest,
    ): CancelablePromise<SettingsDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/console/admin/settings',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
