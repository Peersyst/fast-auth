import { createTestDatabase } from "@backend/test";
import * as entities from "@database/console/entities";
import * as migrations from "@database/console/migrations";

/**
 * Jest global setup: creates the per-worker test database and runs migrations.
 */
export default async function setup(): Promise<void> {
    await createTestDatabase(Object.values(entities), Object.values(migrations));
}
