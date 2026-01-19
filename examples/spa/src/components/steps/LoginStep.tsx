import React, { useState } from "react";
import LoginButton from "../LoginButton";
import { LogoutButton } from "../LogoutButton";
import Accordion from "../Accordion";
import Spinner from "../Spinner";

interface LoginStepProps {
    loggedIn: boolean;
    publicKey: string | null;
    onLogin: () => Promise<void>;
    expanded: boolean;
    onToggle: () => void;
}

const LoginStep: React.FC<LoginStepProps> = ({
    loggedIn,
    publicKey,
    onLogin,
    expanded,
    onToggle,
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await onLogin();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Accordion title="1. Login" expanded={expanded} onClick={onToggle}>
            {loggedIn ? (
                <div className="info-row">
                    <p>Public Key: {publicKey}</p>
                    <LogoutButton />
                    <button 
                        style={{ marginLeft: 8 }} 
                        onClick={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size={18} /> : "Create Account"}
                    </button>
                </div>
            ) : (
                <LoginButton handleLogin={handleLogin}/>
            )}
        </Accordion>
    );
};

export default LoginStep;
