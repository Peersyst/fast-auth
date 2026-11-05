export interface State<T> {
    /**
     * Gets the state.
     * @returns The state.
     */
    getState: () => T;

    /**
     * Sets the state.
     * @param value The new state.
     */
    setState: (value: Partial<T> | ((prevState: T) => T)) => void;

    /**
     * Subscribes to the state.
     * @param listener The listener to subscribe.
     * @returns The unsubscribe function.
     */
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;

    /**
     * Resets the state.
     */
    reset: () => void;
}
