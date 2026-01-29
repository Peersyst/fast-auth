import React from "react";
import { Transaction } from "near-api-js/lib/transaction";
import { SignatureRequest } from "@fast-auth-near/browser-sdk";
import Accordion from "../Accordion";
import Spinner from "../Spinner";

interface SignTransactionStepProps {
    signatureRequest: SignatureRequest | null;
    transactionSigned: boolean;
    signing: boolean;
    onSignTransaction: () => Promise<void>;
    expanded: boolean;
    onToggle: () => void;
    canToggle: boolean;
}

const SignTransactionStep: React.FC<SignTransactionStepProps> = ({
    signatureRequest,
    transactionSigned,
    signing,
    onSignTransaction,
    expanded,
    onToggle,
    canToggle,
}) => {
    return (
        <Accordion 
            title="4. Sign Transaction" 
            expanded={expanded} 
            onClick={() => canToggle && onToggle()}
        >
            {signatureRequest && (
                <div>
                    <p>
                        Signature Request:{" "}
                        {JSON.stringify(
                            Transaction.decode(signatureRequest.signPayload),
                            (_, value) => (typeof value === "bigint" ? value.toString() : value),
                            2,
                        )}
                    </p>
                    <button onClick={onSignTransaction} disabled={signing}>
                        {signing ? <Spinner size={18} /> : "Sign Transaction"}
                    </button>
                </div>
            )}
            {transactionSigned && <p>Transaction signed!</p>}
        </Accordion>
    );
};

export default SignTransactionStep;
