const express = require("express");
const app = express();
const { auth } = require("express-oauth2-jwt-bearer");

const port = process.env.PORT || 8080;

const jwtCheck = auth({
    audience: "https://fast-auth-poc.com",
    issuerBaseURL: "https://dev-gb1h5yrepb85jstz.us.auth0.com/",
    tokenSigningAlg: "RS256",
});

// enforce on all endpoints
app.use(jwtCheck);

app.get("/authorized", function (req, res) {
    res.send("Secured Resource");
});

app.listen(port);

console.log("Running on port ", port);
