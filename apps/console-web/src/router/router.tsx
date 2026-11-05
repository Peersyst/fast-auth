import { BrowserRouter, Navigate, useRoutes } from "react-router";
import { AppLayout } from "../modules/common/containers/app-layout/app-layout";
import { HomeScreen } from "../modules/common/screens/home/home.screen";
import { NotFoundScreen } from "../modules/common/screens/not-found/not-found.screen";
import { SessionGate } from "../modules/session/containers/session-gate/session-gate";
import { DappsListScreen } from "../modules/admin/screens/dapps-list/dapps-list.screen";
import { DappDetailScreen } from "../modules/admin/screens/dapp-detail/dapp-detail.screen";

export function Routes(): React.JSX.Element | null {
    return useRoutes([
        {
            element: <AppLayout />,
            children: [
                { element: <SessionGate />, children: [{ index: true, element: <HomeScreen /> }] },
                {
                    path: "admin",
                    element: <SessionGate role="admin" />,
                    children: [
                        { index: true, element: <Navigate to="dapps" replace /> },
                        { path: "dapps", element: <DappsListScreen /> },
                        { path: "dapps/:id", element: <DappDetailScreen /> },
                    ],
                },
                { path: "*", element: <NotFoundScreen /> },
            ],
        },
    ]);
}

export default function Router(): React.JSX.Element {
    return (
        <BrowserRouter>
            <Routes />
        </BrowserRouter>
    );
}
