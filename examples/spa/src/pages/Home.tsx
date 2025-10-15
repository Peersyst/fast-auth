import React from "react";
import "./Home.css";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import { useFastAuthWorkflow } from "../hooks/use-fast-auth-workflow";
import {
    LoginStep,
    CreateAccountStep,
    RequestTransactionStep,
    SignTransactionStep,
    BroadcastStep,
} from "../components/steps";

const Home: React.FC = () => {
    const { error } = useFastAuth();
    const {
        loggedIn,
        publicKey,
        signatureRequest,
        result,
        accountCreated,
        transferRequested,
        transactionSigned,
        expandedStep,
        signing,
        sending,
        txHash,
        setExpandedStep,
        handleLogin,
        handleCreateAccount,
        requestTransactionSignature,
        handleSignTransaction,
        handleSendTransaction,
    } = useFastAuthWorkflow();

    return (
        <div className="home-page">
            <h1>FastAuth integration</h1>
            <p>
                This is a sample application that demonstrates how to interact with the FastAuth contract to sign transactions through the
                MPC.
            </p>
            
            <LoginStep
                loggedIn={loggedIn}
                publicKey={publicKey}
                onLogin={handleLogin}
                expanded={expandedStep === 0}
                onToggle={() => setExpandedStep(0)}
            />
            
            <CreateAccountStep
                accountCreated={accountCreated}
                onAccountCreate={handleCreateAccount}
                onSkip={() => setExpandedStep(2)}
                expanded={expandedStep === 1}
                onToggle={() => setExpandedStep(1)}
                canToggle={loggedIn}
            />
            
            <RequestTransactionStep
                transferRequested={transferRequested}
                onRequestTransaction={requestTransactionSignature}
                expanded={expandedStep === 2}
                onToggle={() => setExpandedStep(2)}
                canToggle={accountCreated}
            />
            
            <SignTransactionStep
                signatureRequest={signatureRequest}
                transactionSigned={transactionSigned}
                signing={signing}
                onSignTransaction={handleSignTransaction}
                expanded={expandedStep === 3}
                onToggle={() => setExpandedStep(3)}
                canToggle={transferRequested}
            />
            
            <BroadcastStep
                result={result}
                txHash={txHash}
                sending={sending}
                onSendTransaction={handleSendTransaction}
                expanded={expandedStep === 4}
                onToggle={() => setExpandedStep(4)}
                canToggle={transactionSigned}
            />
            
            {error && <p>Error: {error.message}</p>}
        </div>
    );
};

export default Home;
