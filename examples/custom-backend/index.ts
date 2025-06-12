import { Request, Response } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import * as fs from "node:fs";
import { createPublicKey } from 'crypto'

const app = express();

const PORT = 3000;
const JWT_ISSUER = "https://fa-custom-backend.com";
const JWT_SUBJECT = "user+1@fa-custom-backend.com";
const SIGNING_PAYLOAD = Buffer.from("Hello world").toString("hex");

app.get("/jwt", (_: Request, response: Response) => {
    const token = jwt.sign(
        { payload: SIGNING_PAYLOAD },
        { key: fs.readFileSync("./jwtRS256.key") },
        { expiresIn: "1h", algorithm: "RS256", issuer: JWT_ISSUER, subject: JWT_SUBJECT }
    );
    response.status(200).send(token);
});

app.listen(PORT, () => {
    console.log("Server running at PORT: ", PORT);
    console.log("Jwt issuer: ", JWT_ISSUER);
    const publicKey = createPublicKey(fs.readFileSync("./jwtRS256.pub"));
    const jwk = publicKey.export({ format: 'jwk' });

    console.log("Jwt public key [n]: ", jwk.n);
    console.log("Jwt public key [e]: ", jwk.e);
}).on("error", (error: Error) => {
    throw new Error(error.message);
});
