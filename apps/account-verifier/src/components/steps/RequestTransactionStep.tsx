import React, { useState } from "react";
import Accordion from "../Accordion";
import Spinner from "../Spinner";

interface RequestTransactionStepProps {
    transferRequested: boolean;
    onRequestTransaction: (accountId: string, receiverId: string, amount: string) => Promise<void>;
    expanded: boolean;
    onToggle: () => void;
    canToggle: boolean;
}

const RequestTransactionStep: React.FC<RequestTransactionStepProps> = ({
    transferRequested,
    onRequestTransaction,
    expanded,
    onToggle,
    canToggle,
}) => {
    const [isRequesting, setIsRequesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const accountId = formData.get("accountid") as string;
        const receiverId = formData.get("receiverid") as string;
        const amount = formData.get("amount") as string;

        if (!accountId.trim() || !receiverId.trim() || !amount.trim()) {
            setError("All fields are required");
            return;
        }

        setIsRequesting(true);
        setError(null);

        try {
            await onRequestTransaction(accountId, receiverId, amount);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to request transaction");
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <Accordion
            title="3. Request Transaction Approval"
            expanded={expanded}
            onClick={() => canToggle && onToggle()}
        >
            <form onSubmit={handleSubmit}>
                <label className="info-label">
                    Account ID
                    <input 
                        type="text" 
                        placeholder="Enter Account ID" 
                        name="accountid" 
                        required 
                        disabled={isRequesting}
                    />
                </label>
                <label className="info-label">
                    Receiver ID
                    <input 
                        type="text" 
                        placeholder="Enter Receiver ID" 
                        name="receiverid" 
                        required 
                        disabled={isRequesting}
                    />
                </label>
                <label className="info-label">
                    Amount
                    <input 
                        type="text" 
                        placeholder="Enter Amount" 
                        name="amount" 
                        required 
                        disabled={isRequesting}
                    />
                </label>
                <button type="submit" disabled={isRequesting}>
                    {isRequesting ? <Spinner size={18} /> : "Request"}
                </button>
                {error && <p style={{ color: "red" }}>Error: {error}</p>}
            </form>
            {transferRequested && <p>Requesting transaction approval...</p>}
        </Accordion>
    );
};

export default RequestTransactionStep;
