import { Fragment, useEffect, useState } from "react";
import "./Home.css";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import LoginButton from "../components/LoginButton";
import { LogoutButton } from "../components/LogoutButton";

const Home: React.FC = () => {
    const { isClientInitialized, error, client, relayer } = useFastAuth();

    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        if (isClientInitialized) {
            client?.getSigner().then((signer) => {
                console.log("signer", signer);
                if (signer) {
                    signer
                        .getPublicKey(relayer?.getConnection().connection)
                        .then((publicKey) => {
                            console.log(publicKey.toString());
                            setLoggedIn(true);
                        })
                        .catch((error) => {
                            setLoggedIn(false);
                            console.error(error);
                        });
                }
            });
        }
    }, [isClientInitialized]);

    return (
        <Fragment>
            <h1>FastAuth Wallet</h1>
            <p>
                This is a sample application that demonstrates how to interact with the FastAuth contract to sign transactions through the
                MPC.
            </p>
            {loggedIn ? <LogoutButton /> : <LoginButton />}
            {error && <p>Error: {error.message}</p>}
        </Fragment>
    );
};

export default Home;
