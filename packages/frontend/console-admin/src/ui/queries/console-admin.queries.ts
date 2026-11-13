const CONSOLE_ADMIN_ROOT_QUERY_KEY = "console-admin";

export const consoleAdminQueryKeys = {
    all: [CONSOLE_ADMIN_ROOT_QUERY_KEY] as const,
    dapps: () => [...consoleAdminQueryKeys.all, "dapps"] as const,
    list: (page: number) => [...consoleAdminQueryKeys.dapps(), "list", page] as const,
    detail: (id: string) => [...consoleAdminQueryKeys.dapps(), "detail", id] as const,
};
