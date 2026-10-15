import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import { DappDetail } from "../features/admin/DappDetail";
import { DappsList } from "../features/admin/DappsList";
import { AppLayout } from "./AppLayout";
import { Home } from "./Home";
import { NotFound } from "./NotFound";
import { RequireSession } from "./RequireSession";

export const routes: RouteObject[] = [
    {
        element: <AppLayout />,
        children: [
            { element: <RequireSession />, children: [{ index: true, element: <Home /> }] },
            {
                path: "admin",
                element: <RequireSession role="admin" />,
                children: [
                    { index: true, element: <Navigate to="dapps" replace /> },
                    { path: "dapps", element: <DappsList /> },
                    { path: "dapps/:id", element: <DappDetail /> },
                ],
            },
            { path: "*", element: <NotFound /> },
        ],
    },
];

export const router = createBrowserRouter(routes);
