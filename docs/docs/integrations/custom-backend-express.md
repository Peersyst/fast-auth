# Express

# Integrate your custom backend

This guide shows how to build a custom backend that generates JWT tokens for FastAuth transaction signing using Express.js.

## Prerequisites

- Node.js and npm/pnpm installed
- RSA key pair for JWT signing

## Step 1: Generate RSA Key Pair

```bash
# Generate private key
openssl genrsa -out jwtRS256.key 2048

# Generate public key
openssl rsa -in jwtRS256.key -pubout -out jwtRS256.pub
```

## Step 2: Install Dependencies

```bash
npm install express jsonwebtoken
npm install -D @types/express @types/jsonwebtoken @types/node typescript
```

## Step 3: Create the Express Server

```typescript
import { Request, Response } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import * as fs from "node:fs";
import { createPublicKey } from "crypto";

const app = express();
const PORT = 3000;
const JWT_ISSUER = "https://fa-custom-backend.com";
const JWT_SUBJECT = "user+1@fa-custom-backend.com";
```

## Step 4: Create JWT Generation Endpoint

```typescript
app.get("/jwt", (_: Request, response: Response) => {
    // Your transaction payload (hex-encoded)
    const SIGNING_PAYLOAD = Buffer.from("Hello world").toString("hex");

    const token = jwt.sign(
        { fatxn: SIGNING_PAYLOAD }, // FastAuth transaction claim
        { key: fs.readFileSync("./jwtRS256.key") },
        {
            expiresIn: "1h",
            algorithm: "RS256",
            issuer: JWT_ISSUER,
            subject: JWT_SUBJECT,
        },
    );

    response.status(200).send(token);
});
```

## Step 5: Start Server and Extract Public Key

```typescript
app.listen(PORT, () => {
    console.log("Server running at PORT: ", PORT);
    console.log("Jwt issuer: ", JWT_ISSUER);

    // Extract public key components for contract configuration
    const publicKey = createPublicKey(fs.readFileSync("./jwtRS256.pub"));
    const jwk = publicKey.export({ format: "jwk" });

    console.log("Jwt public key [n]: ", jwk.n);
    console.log("Jwt public key [e]: ", jwk.e);
}).on("error", (error: Error) => {
    throw new Error(error.message);
});
```

## Step 6: Run the Server

```bash
# Compile TypeScript
npx tsc index.ts

# Run the server
node index.js
```

## Step 7: Test JWT Generation

```bash
# Get JWT token
curl http://localhost:3000/jwt
```

## Next Steps

1. Customize the `SIGNING_PAYLOAD` with your actual transaction data
2. Implement user authentication before JWT generation
3. Deploy your [JwtRS256Guard contract](./jwt-rs256-guard) with your custom jwt verification logic
4. Register your guard in the JwtGuardRouter contract
5. Test your integration with the FastAuth contract

## Code

You can find the complete code in the [examples](https://github.com/Peersyst/fast-auth/tree/main/examples/custom-backend) folder.
