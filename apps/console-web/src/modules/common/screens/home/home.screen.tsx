import { Navigate } from "react-router";
import { useSessionUser } from "../../../session/hooks/use-session-user";
import { MyDappScreen } from "../../../dapp/screens/my-dapp/my-dapp.screen";

export function HomeScreen(): React.JSX.Element {
    return useSessionUser().role === "admin" ? <Navigate to="/admin/dapps" replace /> : <MyDappScreen />;
}
