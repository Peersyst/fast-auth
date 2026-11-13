export class ApiError extends Error {
    url: string;
    status: number;
    statusText: string;
    body: {
        statusCode: number;
        /**
         * The error code, or the list of refusals of a request Nest's ValidationPipe rejected.
         */
        message: string | string[];
    };
}
