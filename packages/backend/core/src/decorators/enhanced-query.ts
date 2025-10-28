import { Query, ValidationPipe } from "@nestjs/common";

/**
 * Enables validation and transformation of the query object.
 * @returns The enhanced query.
 */
export const EnhancedQuery = (): ParameterDecorator =>
    Query(
        new ValidationPipe({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
            forbidNonWhitelisted: true,
        }),
    );
