import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { NotFound } from "./NotFound";
import { RequireSession } from "./RequireSession";

export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        children: [
            { element: <RequireSession />, children: [{ index: true, element: <NotFound /> }] },
            { path: "*", element: <NotFound /> },
        ],
    },
]);
