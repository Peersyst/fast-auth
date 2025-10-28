import { useState } from "react";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import Spinner from "./Spinner";

export default function LoginButton() {
    const { client } = useFastAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await client?.login();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button onClick={handleLogin} disabled={isLoading}>
            {isLoading ? <Spinner size={18} /> : "Log in"}
        </button>
    );
}
