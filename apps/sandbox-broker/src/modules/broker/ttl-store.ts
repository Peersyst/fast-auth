/**
 * An in-memory map whose entries expire, and can each be taken once. The broker runs as a single replica, and a
 * sign-in lost to a restart only has to be started again.
 */
export class TtlStore<T> {
    private readonly entries = new Map<string, { value: T; expiresAt: number }>();

    /**
     * Creates an empty store.
     * @param ttlMs How long an entry lives.
     * @param maxEntries The most entries held at once, so that nobody can fill the memory with abandoned sign-ins.
     * @param now The clock.
     */
    constructor(
        private readonly ttlMs: number,
        private readonly maxEntries: number,
        private readonly now: () => number = Date.now,
    ) {}

    /**
     * Stores a value under a key.
     * @param key The key.
     * @param value The value.
     * @returns False, storing nothing, when the store is full of live entries.
     */
    put(key: string, value: T): boolean {
        if (this.entries.size >= this.maxEntries) this.sweep();
        if (this.entries.size >= this.maxEntries) return false;
        this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
        return true;
    }

    /**
     * Removes the entry under a key and returns its value.
     * @param key The key.
     * @returns The value, or undefined when there is none or it has expired.
     */
    take(key: string): T | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        this.entries.delete(key);
        return entry.expiresAt > this.now() ? entry.value : undefined;
    }

    /**
     * Drops every expired entry.
     */
    private sweep(): void {
        const now = this.now();
        for (const [key, { expiresAt }] of this.entries) {
            if (expiresAt <= now) this.entries.delete(key);
        }
    }
}
