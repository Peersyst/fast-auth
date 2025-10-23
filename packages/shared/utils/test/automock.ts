// Mock utils that are not needed in tests
jest.mock("@shared/utils", () => ({
    ...(jest.requireActual("@shared/utils") as any),
    withRetries: (fn: () => any) => fn(),
    timeoutPromise: (promise: Promise<any>, _timeout: number) => promise,
}));
