import { dropTestDatabase } from "@backend/test";

/**
 * Jest global teardown: drops the per-worker test database.
 */
export default async function teardown(): Promise<void> {
    await dropTestDatabase();
}
