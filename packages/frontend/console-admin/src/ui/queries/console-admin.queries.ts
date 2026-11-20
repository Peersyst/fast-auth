const CONSOLE_ADMIN_ROOT_QUERY_KEY = "console-admin";

export const consoleAdminQueryKeys = {
    all: [CONSOLE_ADMIN_ROOT_QUERY_KEY] as const,
    dapps: () => [...consoleAdminQueryKeys.all, "dapps"] as const,
    lists: () => [...consoleAdminQueryKeys.dapps(), "list"] as const,
    list: (page: number) => [...consoleAdminQueryKeys.lists(), page] as const,
    detail: (id: string) => [...consoleAdminQueryKeys.dapps(), "detail", id] as const,
};
