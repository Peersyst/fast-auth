import React, { useState, useEffect } from "react";
import Accordion from "../Accordion";
import Spinner from "../Spinner";
import { useAccessKeys } from "../../hooks/use-access-keys";

interface CreateAccountStepProps {
    accountCreated: boolean;
    publicKey: string | null;
    onAccountCreate: (accountId: string) => Promise<void>;
    onAccountSelect: (accountId: string) => void;
    onSkip: () => void;
    expanded: boolean;
    onToggle: () => void;
    canToggle: boolean;
}

const CreateAccountStep: React.FC<CreateAccountStepProps> = ({
    accountCreated,
    publicKey,
    onAccountCreate,
    onAccountSelect,
    onSkip,
    expanded,
    onToggle,
    canToggle,
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { accountIds, loading, error: accessKeysError, fetchAccessKeys } = useAccessKeys();

    useEffect(() => {
        if (publicKey && expanded) {
            fetchAccessKeys(publicKey);
        }
    }, [publicKey, expanded, fetchAccessKeys]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const accountId = formData.get("accountid") as string;

        if (!accountId.trim()) {
            setError("Account ID is required");
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            await onAccountCreate(accountId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create account");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Accordion
            title="2. Create or Select Account"
            expanded={expanded}
            onClick={() => canToggle && onToggle()}
        >
            <div>
                <h3 style={{ color: "#ffffff", fontSize: "1.2rem", marginBottom: "1rem" }}>Your Accounts</h3>
                {loading && <p style={{ color: "rgba(255, 255, 255, 0.8)" }}><Spinner size={18} /> Loading accounts...</p>}
                {accessKeysError && <p style={{ color: "#ff6b6b", backgroundColor: "rgba(255, 107, 107, 0.1)", padding: "0.75rem", borderRadius: "8px" }}>Error loading accounts: {accessKeysError.message}</p>}
                {!loading && !accessKeysError && accountIds.length > 0 && (
                    <div style={{ marginBottom: "2rem" }}>
                        <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "1rem" }}>Associated accounts ({accountIds.length}):</p>
                        <ul className="accounts-list">
                            {accountIds.map((accountId) => (
                                <li key={accountId} className="account-item">
                                    <span className="account-id">{accountId}</span>
                                    <button
                                        type="button"
                                        onClick={() => onAccountSelect(accountId)}
                                        className="account-use-btn"
                                    >
                                        Use Account
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {!loading && !accessKeysError && accountIds.length === 0 && (
                    <p style={{ color: "rgba(255, 255, 255, 0.6)", fontStyle: "italic", marginBottom: "2rem" }}>No accounts found for this public key.</p>
                )}

                <h3 style={{ color: "#ffffff", fontSize: "1.2rem", marginBottom: "1rem" }}>Create New Account</h3>
                <form onSubmit={handleSubmit}>
                    <div className="info-row">
                        <input
                            type="text"
                            placeholder="Enter account ID"
                            name="accountid"
                            required
                            disabled={isCreating}
                        />
                        <button type="submit" disabled={isCreating}>
                            {isCreating ? <Spinner size={18} /> : "Create Account"}
                        </button>
                        <p>or</p>
                        <button type="button" onClick={onSkip} disabled={isCreating}>
                            Skip to request transaction approval
                        </button>
                    </div>
                    {error && <p style={{ color: "red" }}>Error: {error}</p>}
                </form>
                {accountCreated && <p>Account created!</p>}
            </div>
        </Accordion>
    );
};

export default CreateAccountStep;
