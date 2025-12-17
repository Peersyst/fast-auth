import React, { useState } from "react";
import Accordion from "../Accordion";
import Spinner from "../Spinner";

interface CreateAccountStepProps {
    accountCreated: boolean;
    onAccountCreate: (accountId: string) => Promise<void>;
    onSkip: () => void;
    expanded: boolean;
    onToggle: () => void;
    canToggle: boolean;
}

const CreateAccountStep: React.FC<CreateAccountStepProps> = ({
    accountCreated,
    onAccountCreate,
    onSkip,
    expanded,
    onToggle,
    canToggle,
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            title="2. Create Account" 
            expanded={expanded} 
            onClick={() => canToggle && onToggle()}
        >
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
        </Accordion>
    );
};

export default CreateAccountStep;
