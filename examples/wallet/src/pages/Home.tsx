import { Fragment } from "react";
import "./Home.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useFastAuthRelayer } from "../hooks/use-fast-auth-relayer";
import LoginButton from "../components/LoginButton";
import DerivePublicKeyButton from "../components/DerivePublicKeyButton";

const Home: React.FC = () => {
    const { isAuthenticated, user, getAccessTokenSilently, logout } = useAuth0();
    const { isInitialized, error } = useFastAuthRelayer();

    return (
        <Fragment>
            <h1>FastAuth Wallet</h1>
            <p>
                This is a sample application that demonstrates how to interact with the FastAuth contract to sign transactions through the
                MPC.
            </p>
            <button onClick={() => getAccessTokenSilently().then(console.log)}>Get JWT</button>
            {isAuthenticated && user && (
                <div>
                    <p>You are logged in as {user.sub}</p>
                    {user.sub && <DerivePublicKeyButton sub={user.sub} />}
                </div>
            )}

            {!isAuthenticated && <LoginButton />}
            {isInitialized && <p>Relayer initialized</p>}
            {error && <p>Error: {error.message}</p>}
            <button onClick={() => logout()}>Logout</button>
        </Fragment>
    );
};

export default Home;
