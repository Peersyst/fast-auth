import React from "react";
import Accordion from "../Accordion";
import Spinner from "../Spinner";

interface BroadcastStepProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any;
    txHash: string | null;
    sending: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSendTransaction: () => Promise<any>;
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
