import { TtlStore } from "../../src/modules/broker/ttl-store";

describe("TtlStore", () => {
    let now: number;
    const clock = () => now;

    beforeEach(() => {
        now = 1_000;
    });

    it("should hand a value out once", () => {
        const store = new TtlStore<string>(100, 10, clock);
        store.put("key", "value");

        expect(store.take("key")).toBe("value");
        expect(store.take("key")).toBeUndefined();
    });

    it("should not hand out an expired value", () => {
        const store = new TtlStore<string>(100, 10, clock);
        store.put("key", "value");
        now += 100;

        expect(store.take("key")).toBeUndefined();
    });

    it("should refuse new values while it is full of live ones", () => {
        const store = new TtlStore<string>(100, 2, clock);

        expect(store.put("a", "1")).toBe(true);
        expect(store.put("b", "2")).toBe(true);
        expect(store.put("c", "3")).toBe(false);
        expect(store.take("c")).toBeUndefined();
    });

    it("should make room by dropping expired values", () => {
        const store = new TtlStore<string>(100, 2, clock);
        store.put("a", "1");
        now += 50;
        store.put("b", "2");
        now += 60;

        expect(store.put("c", "3")).toBe(true);
        expect(store.take("a")).toBeUndefined();
        expect(store.take("b")).toBe("2");
        expect(store.take("c")).toBe("3");
    });
});
