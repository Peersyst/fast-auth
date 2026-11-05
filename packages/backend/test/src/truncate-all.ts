import { DataSource } from "typeorm";

/**
 * Truncates all tables in the database with CASCADE.
 * Skips TypeORM's internal `migrations` table.
 * @param dataSource An initialized TypeORM DataSource.
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
    const entities = dataSource.entityMetadatas;

    const tableNames = entities
        .filter((entity) => entity.tableType === "regular")
        .map((entity) => `"${entity.tableName}"`)
        .join(", ");

    if (tableNames.length > 0) {
        await dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE`);
    }
}
