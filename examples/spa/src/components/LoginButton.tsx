import React, { useState } from "react";
import { useFastAuth, ProviderType } from "../hooks/use-fast-auth-relayer";
import Spinner from "./Spinner";


interface LoginButtonProps {
    handleLogin: () => Promise<void>;
}

const LoginButton: React.FC<LoginButtonProps> = ({handleLogin}) => {
    const { client, providerType, setProviderType } = useFastAuth();
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {

        setIsLoading(true);
        try {
            if (providerType === "auth0") {
                await client?.login();
            } else {
                const firebaseProviderType = providerType === "firebase-google" ? "google" : "apple";
                await client?.login(firebaseProviderType);
                await handleLogin();
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            <select value={providerType as ProviderType} onChange={(v) => setProviderType(v.target.value as ProviderType)} disabled={isLoading}>
                <option value="auth0">Auth0</option>
                <option value="firebase-google">Firebase Google</option>
                <option value="firebase-apple">Firebase Apple</option>
            </select>
            <button onClick={onClick} disabled={isLoading}>
                {isLoading ? <Spinner size={18} /> : "Log in"}
            </button>
        </div>
    );
}
export default LoginButton;

