const CONSOLE_DAPP_ROOT_QUERY_KEY = "console-dapp";

export const consoleDappQueryKeys = {
    all: [CONSOLE_DAPP_ROOT_QUERY_KEY] as const,
    myDapp: () => [...consoleDappQueryKeys.all, "my-dapp"] as const,
};

export type ConsoleDappQueryKeys = typeof consoleDappQueryKeys;
