import { Outlet } from "react-router";
import { AppHeader } from "../app-header/app-header";

export function AppLayout(): React.JSX.Element {
    return (
        <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr]">
            <AppHeader />
            <main className="mx-auto my-0 w-full max-w-content px-4 py-10">
                <Outlet />
            </main>
        </div>
    );
}
