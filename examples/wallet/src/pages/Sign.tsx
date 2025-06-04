import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./Sign.css"; // Import CSS for styling

const Sign: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [permissions, setPermissions] = useState<string | null>(null);
    const [redirectURL, setRedirectURL] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [copyButtonText, setCopyButtonText] = useState("Copy Redirect URL");

    useEffect(() => {
        const perms = searchParams.get("permissions");
        const redirUrl = searchParams.get("redirectURL");
        const pubKey = searchParams.get("publicKey");

        setPermissions(perms);
        setRedirectURL(redirUrl);
        setPublicKey(pubKey);

        // Optional: Log the found parameters
        console.log("Sign Page Query Params:", { perms, redirUrl, pubKey });
    }, [searchParams]);

    const onCopyRedirectUrl = async () => {
        if (!redirectURL) {
            return;
        }

        try {
            await navigator.clipboard.writeText(redirectURL);
            console.log("Redirect URL copied to clipboard:", redirectURL);
            setCopyButtonText("Copied!");
            setTimeout(() => setCopyButtonText("Copy Redirect URL"), 1500); // Reset text
        } catch (err) {
            console.error("Failed to copy Redirect URL: ", err);
            setCopyButtonText("Copy Failed");
            setTimeout(() => setCopyButtonText("Copy Redirect URL"), 1500);
        }
    };

    return (
        <div className="page-container sign-page">
            <h1>Sign Page</h1>
            <p>Checking for required signing information...</p>

            {!permissions && !redirectURL && !publicKey && <p>No signing parameters detected in the URL.</p>}

            {(permissions || redirectURL || publicKey) && (
                <div className="params-container">
                    <h2>Detected Parameters:</h2>
                    <ul>
                        {permissions && (
                            <li>
                                Permissions: <span className="param-value">{permissions}</span>
                            </li>
                        )}
                        {redirectURL && (
                            <li>
                                Redirect URL: <span className="param-value">{redirectURL}</span>
                            </li>
                        )}
                        {publicKey && (
                            <li>
                                Public Key: <span className="param-value">{publicKey}</span>
                            </li>
                        )}
                    </ul>

                    {redirectURL && (
                        <button onClick={onCopyRedirectUrl} className="copy-button">
                            {copyButtonText}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Sign;
