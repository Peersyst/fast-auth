// Mock global location
export const mockLocation = {
    search: "",
};

/**
 * Setup the global location mock.
 */
export const setupGlobalLocationMock = () => {
    Object.defineProperty(globalThis, "location", {
        value: mockLocation,
        writable: true,
    });
};
