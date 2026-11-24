import React, { useState } from "react";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import Spinner from "./Spinner";


interface LoginButtonProps {
    handleLogin: () => Promise<void>;
}

const LoginButton: React.FC<LoginButtonProps> = ({handleLogin}) => {
    const { client } = useFastAuth();
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {

        setIsLoading(true);
        try {
            await client?.login();
            await handleLogin();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button onClick={onClick} disabled={isLoading}>
            {isLoading ? <Spinner size={18} /> : "Log in"}
        </button>
    );
}
export default LoginButton;

