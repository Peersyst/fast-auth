import { useState } from "react";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import Spinner from "./Spinner";

export function LogoutButton() {
    const { client } = useFastAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await client?.logout();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button onClick={handleLogout} disabled={isLoading}>
            {isLoading ? <Spinner size={18} /> : "Logout"}
        </button>
    );
}
