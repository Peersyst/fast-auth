import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'jwt',
  'token',
  'password',
  'secret',
  'authorization',
  'cookie',
  'apiKey',
  'apikey',
  'x-api-key',
  'accessToken',
  'refreshToken',
];

/**
 * Redacts sensitive information from an object
 */
function redactSensitiveData(obj: any, depth = 0): any {
  if (depth > 5) {
    return '[Max depth reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field),
    );

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Sanitizes request headers by redacting sensitive information
 */
function sanitizeHeaders(headers: any): any {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field),
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Only log errors (4xx and 5xx)
    if (status >= 400) {
      const errorDetails = {
        timestamp: new Date().toISOString(),
        statusCode: status,
        path: request.url,
        method: request.method,
        message:
          typeof message === 'string'
            ? message
            : (message as any).message || message,
        error: typeof message === 'object' ? (message as any).error : undefined,
        ip: request.ip || request.socket.remoteAddress,
        userAgent: request.get('user-agent'),
        // Sanitize request body and headers
        body: request.body ? redactSensitiveData(request.body) : undefined,
        headers: sanitizeHeaders(request.headers),
        query: request.query,
      };

      // Log at appropriate level
      if (status >= 500) {
        this.logger.error('Request failed', {
          ...errorDetails,
          exception:
            exception instanceof Error ? exception.stack : String(exception),
        });
      } else {
        this.logger.warn('Request failed', errorDetails);
      }
    }

    // Send response
    const errorResponse =
      typeof message === 'object'
        ? message
        : {
            statusCode: status,
            message:
              typeof message === 'string' ? message : 'An error occurred',
            timestamp: new Date().toISOString(),
            path: request.url,
          };

    response.status(status).json(errorResponse);
  }
}
