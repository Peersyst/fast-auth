import React from "react";
import Accordion from "../Accordion";
import Spinner from "../Spinner";

interface BroadcastStepProps {
    result: any;
    txHash: string | null;
    sending: boolean;
    onSendTransaction: () => Promise<void>;
    expanded: boolean;
    onToggle: () => void;
    canToggle: boolean;
}

const BroadcastStep: React.FC<BroadcastStepProps> = ({
    result,
    txHash,
    sending,
    onSendTransaction,
    expanded,
    onToggle,
    canToggle,
}) => {
    return (
        <Accordion 
            title="5. Broadcast" 
            expanded={expanded} 
            onClick={() => canToggle && onToggle()}
        >
            {result && (
                <div>
                    <p>To finish the transaction, you need to send it to the network.</p>
                    <button onClick={onSendTransaction} disabled={sending}>
                        {sending ? <Spinner size={18} /> : "Send Transaction"}
                    </button>
                    {txHash && (
                        <p>
                            Transaction hash:{" "}
                            <a 
                                href={`https://testnet.nearblocks.io/txns/${txHash}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                {txHash}
                            </a>
                        </p>
                    )}
                </div>
            )}
        </Accordion>
    );
};

export default BroadcastStep;
