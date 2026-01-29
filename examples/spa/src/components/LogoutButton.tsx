import { useState } from "react";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import Spinner from "./Spinner";
import {FastAuthClient} from "@fast-auth-near/browser-sdk";
import {JavascriptProvider} from "@fast-auth-near/javascript-provider";
import config from "../config.ts";

export function LogoutButton() {
    const { client } = useFastAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await (client as FastAuthClient<JavascriptProvider>)?.logout({
                clientId: config.auth0.clientId,
                logoutParams: {
                    returnTo: window.location.origin,
                }
            });
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
