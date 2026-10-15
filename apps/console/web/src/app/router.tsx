import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { Home } from "./Home";
import { NotFound } from "./NotFound";
import { RequireSession } from "./RequireSession";

export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        children: [
            { element: <RequireSession />, children: [{ index: true, element: <Home /> }] },
            { path: "*", element: <NotFound /> },
        ],
    },
]);
