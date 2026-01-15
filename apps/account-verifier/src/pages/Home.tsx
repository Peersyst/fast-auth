import React, { useState } from "react";
import "./Home.css";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import { useFastAuthWorkflow } from "../hooks/use-fast-auth-workflow";
import { useAccessKeys } from "../hooks/use-access-keys";

const Home: React.FC = () => {
    const { error: fastAuthError, client, isClientInitialized, network, setNetwork, provider, setProvider } = useFastAuth();
    const { loggedIn, publicKey, fetchPublicKey } = useFastAuthWorkflow();
    const { accessKeys, accountIds, loading, error: accessKeysError, hasFetched, fetchAccessKeys } = useAccessKeys();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
    const [isSwitchingProvider, setIsSwitchingProvider] = useState(false);

    const handleFetchAccessKeys = async () => {
        if (publicKey) {
            await fetchAccessKeys(publicKey);
        }
    };

    const handleLogin = async () => {
        if (!client || !isClientInitialized) {
            return;
        }
        setIsLoggingIn(true);
        try {
            await client.login(provider === "firebase-google" ? "google" : "apple");
            await fetchPublicKey();
        } catch (error) {
            console.error("Login error:", error);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleNetworkChange = async (newNetwork: "testnet" | "mainnet") => {
        if (newNetwork === network || isSwitchingNetwork) {
            return;
        }
        setIsSwitchingNetwork(true);
        try {
            await setNetwork(newNetwork);
        } catch (error) {
            console.error("Network switch error:", error);
        } finally {
            setIsSwitchingNetwork(false);
        }
    };

    const handleProviderChange = async (newProvider: "auth0" | "firebase-google" | "firebase-apple") => {
        if (newProvider === provider || isSwitchingProvider) {
            return;
        }
        setIsSwitchingProvider(true);
        try {
            await setProvider(newProvider);
        } catch (error) {
            console.error("Provider switch error:", error);
        } finally {
            setIsSwitchingProvider(false);
        }
    };

    return (
        <div className="home-page">
            <h1>FastAuth Access Keys Viewer</h1>
            <p>
                Log in with FastAuth to automatically discover all NEAR accounts associated with your public key and view their access keys.
            </p>

            <section>
                <h2>Configuration</h2>
                <div style={{ marginBottom: "1rem" }}>
                    <label className="info-label">
                        Auth Provider:
                        <select
                            value={provider}
                            onChange={(e) => handleProviderChange(e.target.value as "auth0" | "firebase-google" | "firebase-apple")}
                            disabled={isSwitchingProvider}
                            style={{
                                marginTop: "0.5rem",
                                padding: "0.5rem",
                                backgroundColor: "#181a20",
                                color: "#e0e0e0",
                                border: "1px solid #222",
                                borderRadius: "4px",
                                fontSize: "1rem",
                                cursor: isSwitchingProvider ? "not-allowed" : "pointer",
                                opacity: isSwitchingProvider ? 0.6 : 1,
                            }}
                        >
                            <option value="auth0">Auth0</option>
                            <option value="firebase-google">
                                Firebase (Google)
                            </option>
                            <option value="firebase-apple">
                                Firebase (Apple)
                            </option>
                        </select>
                    </label>
                    {isSwitchingProvider && (
                        <div style={{ color: "#4ade80", marginTop: "0.5rem" }}>Switching provider...</div>
                    )}
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label className="info-label">
                        Network:
                        <select
                            value={network}
                            onChange={(e) => handleNetworkChange(e.target.value as "testnet" | "mainnet")}
                            disabled={isSwitchingNetwork}
                            style={{
                                marginTop: "0.5rem",
                                padding: "0.5rem",
                                backgroundColor: "#181a20",
                                color: "#e0e0e0",
                                border: "1px solid #222",
                                borderRadius: "4px",
                                fontSize: "1rem",
                                cursor: isSwitchingNetwork ? "not-allowed" : "pointer",
                                opacity: isSwitchingNetwork ? 0.6 : 1,
                            }}
                        >
                            <option value="testnet">Testnet</option>
                            <option value="mainnet">Mainnet</option>
                        </select>
                    </label>
                    {isSwitchingNetwork && (
                        <div style={{ color: "#4ade80", marginTop: "0.5rem" }}>Switching network...</div>
                    )}
                </div>
            </section>

            <section>
                <h2>Login Status</h2>
                {loggedIn ? (
                    <div>
                        <div className="info-row">
                            <span className="info-label">Status:</span>
                            <span className="info-value" style={{ color: "#4ade80" }}>✓ Logged In</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Public Key:</span>
                            <span className="info-value">{publicKey}</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="info-row">
                            <span className="info-label">Status:</span>
                            <span className="info-value" style={{ color: "#f87171" }}>Not Logged In</span>
                        </div>
                        <p>Please log in to view your public key.</p>
                        <button
                            onClick={handleLogin}
                            disabled={!isClientInitialized || isLoggingIn}
                            style={{
                                marginTop: "1rem",
                                padding: "0.75rem 1.5rem",
                                backgroundColor: isClientInitialized && !isLoggingIn ? "#4ade80" : "#666",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: isClientInitialized && !isLoggingIn ? "pointer" : "not-allowed",
                                fontSize: "1rem",
                                fontWeight: "500",
                            }}
                        >
                            {isLoggingIn ? "Logging in..." : isClientInitialized ? `Log in with ${provider === "auth0" ? "Auth0" : "Firebase"}` : "Initializing..."}
                        </button>
                    </div>
                )}
            </section>

            {loggedIn && (
                <section>
                    <h2>Access Keys</h2>
                    <div style={{ marginBottom: "1rem" }}>
                        <button
                            onClick={handleFetchAccessKeys}
                            disabled={loading || !publicKey}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: loading || !publicKey ? "#666" : "#4ade80",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: loading || !publicKey ? "not-allowed" : "pointer",
                                fontSize: "1rem",
                                fontWeight: "500",
                                opacity: loading || !publicKey ? 0.6 : 1,
                            }}
                        >
                            {loading ? "Loading..." : "Fetch All Access Keys"}
                        </button>
                    </div>

                    {accessKeysError && (
                        <div style={{ color: "#f87171", marginTop: "1rem" }}>
                            Error: {accessKeysError.message}
                        </div>
                    )}

                    {accountIds.length > 0 && (
                        <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                            <h3>Accounts Found ({accountIds.length})</h3>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                {accountIds.map((accountId) => (
                                    <span
                                        key={accountId}
                                        style={{
                                            padding: "0.25rem 0.75rem",
                                            backgroundColor: "#181a20",
                                            border: "1px solid #333",
                                            borderRadius: "4px",
                                            fontSize: "0.9rem",
                                            color: "#e0e0e0",
                                        }}
                                    >
                                        {accountId}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasFetched && !loading && !accessKeysError && accessKeys.length === 0 && accountIds.length === 0 && (
                        <div style={{ marginTop: "1rem", color: "#bbb", fontStyle: "italic" }}>
                            No accounts found for this public key.
                        </div>
                    )}

                    {hasFetched && !loading && !accessKeysError && accessKeys.length === 0 && accountIds.length > 0 && (
                        <div style={{ marginTop: "1rem", color: "#bbb", fontStyle: "italic" }}>
                            No access keys found for the discovered accounts.
                        </div>
                    )}

                    {accessKeys.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                            <h3>Access Keys ({accessKeys.length})</h3>
                            {accessKeys.map((keyInfo, index) => {
                                const isUserKey = keyInfo.publicKey === publicKey;
                                return (
                                    <div
                                        key={index}
                                        style={{
                                            marginBottom: "1rem",
                                            padding: "1rem",
                                            border: `1px solid ${isUserKey ? "#4ade80" : "#333"}`,
                                            borderRadius: "4px",
                                            backgroundColor: isUserKey ? "#1a2e1a" : "#181a20",
                                        }}
                                    >
                                        {isUserKey && (
                                            <div
                                                style={{
                                                    color: "#4ade80",
                                                    fontWeight: "bold",
                                                    marginBottom: "0.5rem",
                                                }}
                                            >
                                                ✓ Your Public Key
                                            </div>
                                        )}
                                        <div className="info-row">
                                            <span className="info-label">Account:</span>
                                            <span className="info-value">{keyInfo.accountId}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Public Key:</span>
                                            <span className="info-value">{keyInfo.publicKey}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Nonce:</span>
                                            <span className="info-value">{keyInfo.accessKey.nonce}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Permission:</span>
                                            <span className="info-value">
                                                {typeof keyInfo.accessKey.permission === "string"
                                                    ? keyInfo.accessKey.permission === "FullAccess"
                                                        ? "Full Access"
                                                        : keyInfo.accessKey.permission
                                                    : keyInfo.accessKey.permission.FunctionCall
                                                        ? `Function Call: ${keyInfo.accessKey.permission.FunctionCall.receiver_id} (${keyInfo.accessKey.permission.FunctionCall.method_names?.join(", ") || "all methods"})`
                                                        : JSON.stringify(keyInfo.accessKey.permission, null, 2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {(fastAuthError || accessKeysError) && (
                <section style={{ borderColor: "#f87171" }}>
                    <h2 style={{ color: "#f87171" }}>Error</h2>
                    {fastAuthError && <p>FastAuth Error: {fastAuthError.message}</p>}
                    {accessKeysError && <p>Access Keys Error: {accessKeysError.message}</p>}
                </section>
            )}
        </div>
    );
};

export default Home;
