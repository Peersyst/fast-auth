import { ListDappsParams } from "../interfaces";

const CONSOLE_ADMIN_ROOT_QUERY_KEY = "console-admin";

export const consoleAdminQueryKeys = {
    all: [CONSOLE_ADMIN_ROOT_QUERY_KEY] as const,
    dapps: () => [...consoleAdminQueryKeys.all, "dapps"] as const,
    list: (params: ListDappsParams) => [...consoleAdminQueryKeys.dapps(), "list", params] as const,
    detail: (id: string) => [...consoleAdminQueryKeys.dapps(), "detail", id] as const,
    events: (id: string) => [...consoleAdminQueryKeys.dapps(), "detail", id, "events"] as const,
};
