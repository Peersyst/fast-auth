import React from "react";
import { Router, Route, Switch } from "react-router-dom";
import { Container } from "reactstrap";

import Loading from "./components/Loading";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./views/Home";
import Profile from "./views/Profile";
import ExternalApi from "./views/ExternalApi";
import { useAuth0 } from "@auth0/auth0-react";
import history from "./utils/history";

// styles
import "./App.css";

// fontawesome
import initFontAwesome from "./utils/initFontAwesome";
initFontAwesome();

const App = () => {
    const { isLoading, error, getAccessTokenWithPopup, isAuthenticated } = useAuth0();

    React.useEffect(() => {
        getAccessTokenWithPopup({
            authorizationParams: {
                imageUrl:
                    "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
                name: "Peersyst Technology",
                permissions: JSON.stringify({
                    sendTransaction: true,
                    readTransaction: true,
                    sendTest: true,
                    readTest: true,
                    sendTest2: true,
                    readTest2: true,
                    sendTest3: true,
                    readTest3: true,
                    sendTest4: true,
                    readTest4: true,
                    sendTest5: true,
                    readTest5: true,
                    sendTest6: true,
                    readTest6: true,
                    sendTest7: true,
                    readTest7: true,
                    sendTest8: true,
                    readTest8: true,
                    sendTest9: true,
                    readTest9: true,
                    sendTest10: true,
                    readTest10: true,
                    sendTest11: true,
                    readTest11: true,
                    preSendTransaction: true,
                    preReadTransaction: true,
                    preSendTest: true,
                    preReadTest: true,
                    preSendTest2: true,
                    preReadTest2: true,
                    preSendTest3: true,
                    preReadTest3: true,
                    preSendTest4: true,
                    preReadTest4: true,
                    preSendTest5: true,
                    preReadTest5: true,
                    preSendTest6: true,
                    preReadTest6: true,
                    preSendTest7: true,
                    preReadTest7: true,
                    preSendTest8: true,
                    preReadTest8: true,
                    preSendTest9: true,
                    preReadTest9: true,
                    preSendTest10: true,
                    preReadTest10: true,
                    preSendTest11: true,
                    preReadTest11: true,
                }),
                scope: "transaction:send-transaction transaction:read-transaction test:send-test",
            },
        })
            .then((token) => {
                console.log(token);
            })
            .catch((err) => {
                console.error(err);
            });
    }, [isAuthenticated]);

    if (error) {
        return <div>Oops... {error.message}</div>;
    }

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Router history={history}>
            <div id="app" className="d-flex flex-column h-100">
                <NavBar />
                <Container className="flex-grow-1 mt-5">
                    <Switch>
                        <Route path="/" exact component={Home} />
                        <Route path="/profile" component={Profile} />
                        <Route path="/external-api" component={ExternalApi} />
                    </Switch>
                </Container>
                <Footer />
            </div>
        </Router>
    );
};

export default App;
