import { Datastore } from "@google-cloud/datastore";

export type MpcUser = {
    encrypted_key_pair: string;
    internal_account_id: string;
    node: number;
    public_key: string;
};

export class MpcDatabase {
    datastore: Datastore;

    constructor(
        projectId: string,
        private readonly kind: string,
        private readonly pageSize = 1_000,
    ) {
        this.datastore = new Datastore({
            projectId,
            credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON || "{}"),
        });
    }

    /**
     *
     * @param callback
     */
    async iterateAll(callback: (user: MpcUser) => Promise<void>): Promise<void> {
        let more = true;
        let nextPageCursor = null;

        while (more) {
            const query = this.datastore.createQuery(this.kind).limit(this.pageSize);

            // Add cursor if continuing pagination
            if (nextPageCursor) {
                query.start(nextPageCursor);
            }

            const [entities, metadata] = await this.datastore.runQuery(query);
            for (const entity of entities) {
                await callback(entity);
            }

            // Pagination info
            nextPageCursor = metadata.endCursor;
            more = metadata.moreResults !== Datastore.NO_MORE_RESULTS;
        }
    }
}
