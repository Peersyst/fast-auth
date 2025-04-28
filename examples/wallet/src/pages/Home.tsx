import { Fragment, useState } from "react";
import "./Home.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useFastAuthRelayer } from "../hooks/use-fast-auth-relayer";
import LoginButton from "../components/LoginButton";
import { Buffer } from "buffer";

const Home: React.FC = () => {
    const { isAuthenticated, getAccessTokenSilently, user } = useAuth0();
    const { isInitialized, error, relayer } = useFastAuthRelayer();
    const [signature, setSignature] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const jwt = await getAccessTokenSilently();
        const formData = new FormData(e.target as HTMLFormElement);
        const message = formData.get("message") as string;
        if (message) {
            const signature = await relayer?.sign(message, jwt);
            console.log(signature);

            setSignature(Buffer.from(signature.status.SuccessValue, "base64").toString());
        } else {
            alert("Message must be 32 characters long");
        }
    };

    return (
        <Fragment>
            <h1>FastAuth Wallet</h1>
            <p>
                This is a sample application that demonstrates how to interact with the FastAuth contract to sign transactions through the
                MPC.
            </p>
            {isAuthenticated && <p>You are logged in as {user?.sub}</p>}
            {!isAuthenticated && <LoginButton />}
            {isInitialized && <p>Relayer initialized</p>}
            {error && <p>Error: {error.message}</p>}
            <form onSubmit={handleSubmit}>
                <input name="message" type="text" placeholder="Write a message" className="transaction-input" />
                <button type="submit">Send Transaction</button>
            </form>
            {signature && <p>Signature: {signature}</p>}
        </Fragment>
    );
};

export default Home;
