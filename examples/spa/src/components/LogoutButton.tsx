import { useFastAuth } from "../hooks/use-fast-auth-relayer";

export function LogoutButton() {
    const { client } = useFastAuth();
    return <button onClick={() => client?.logout()}>Logout</button>;
}
