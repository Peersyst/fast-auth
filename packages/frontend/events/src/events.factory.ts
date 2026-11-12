import EventEmitter from "./event-emitter";

/**
 * Factory function to create a new event emitter.
 * @param domainEventEmitters The domain event emitters.
 * @returns The event emitter.
 */
export default function EventsFactory<
    DEM extends Record<string, EventEmitter<any>>,
    DE extends { [K in keyof DEM]: DEM[K] extends EventEmitter<infer T> ? EventEmitter<T> : never },
>(domainEventEmitters: DEM): DE {
    return domainEventEmitters as unknown as DE;
}
