import { Navigate } from "react-router-dom";
import { useSession } from "../features/auth/session";
import { MyDappPage } from "../features/my-dapp/MyDappPage";

export function Home() {
    return useSession().role === "admin" ? <Navigate to="/admin/dapps" replace /> : <MyDappPage />;
}
