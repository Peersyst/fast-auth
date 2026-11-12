export abstract class AbstractRepository {
    protected readonly storageKey: string;

    protected constructor(key: string) {
        this.storageKey = key;
    }
}
