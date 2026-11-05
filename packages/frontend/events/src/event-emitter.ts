import EventEmitterDefaultExport, { EventEmitter as EventEmitterNamedExport } from "events";

const Emitter = EventEmitterDefaultExport || EventEmitterNamedExport;

export type EventEmitterOptions = ConstructorParameters<typeof Emitter>[0] & {
    maxListeners?: number;
};

export default class EventEmitter<EventsDef extends Record<string, (...args: any[]) => any>> {
    private emitter;

    constructor({ maxListeners, ...emitterOptions }: EventEmitterOptions = {}) {
        this.emitter = new Emitter(emitterOptions);

        if (maxListeners) {
            this.emitter.setMaxListeners(maxListeners);
        }
    }

    /**
     * Emits an event.
     * @param event The event name.
     * @param args The event arguments.
     * @returns Whether the event was emitted.
     */
    emit<Event extends keyof EventsDef>(event: Event, ...args: Parameters<EventsDef[Event]>): boolean {
        return this.emitter.emit(event as string, ...args);
    }

    /**
     * Emits an event once.
     * @param event The event name.
     * @param listener The event listener.
     * @returns A function to remove the event listener.
     */
    once<Event extends keyof EventsDef>(event: Event, listener: EventsDef[Event]): () => void {
        this.emitter.once(event as string, listener);
        return () => this.off(event, listener);
    }

    /**
     * Adds an event listener.
     * @param event The event name.
     * @param listener The event listener.
     * @returns A function to remove the event listener.
     */
    on<Event extends keyof EventsDef>(event: Event, listener: EventsDef[Event]): () => void {
        this.emitter.on(event as string, listener);
        return () => this.off(event, listener);
    }

    /**
     * Removes an event listener.
     * @param event The event name.
     * @param listener The event listener.
     */
    off<Event extends keyof EventsDef>(event: Event, listener: EventsDef[Event]): void {
        this.emitter.off(event as string, listener);
    }
}
