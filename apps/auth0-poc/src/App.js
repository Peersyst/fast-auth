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
                permissions: "permissions",
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
