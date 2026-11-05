const CONSOLE_AUTH_ROOT_QUERY_KEY = "console-auth";

export const consoleAuthQueryKeys = {
    all: [CONSOLE_AUTH_ROOT_QUERY_KEY] as const,
    session: () => [...consoleAuthQueryKeys.all, "session"] as const,
    me: () => [...consoleAuthQueryKeys.all, "me"] as const,
};

export type ConsoleAuthQueryKeys = typeof consoleAuthQueryKeys;
