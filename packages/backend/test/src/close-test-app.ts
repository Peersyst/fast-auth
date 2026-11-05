import { INestApplication } from "@nestjs/common";

/**
 * Gracefully closes a NestJS test application.
 * @param app The NestJS application to close.
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
    await app.close();
}
