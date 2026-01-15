# Integrate with your dApp

This guide walks you through integrating FastAuth into your decentralized application. By the end, you'll have users authenticating with their existing Web2 identities and signing NEAR transactions.

## 1. Select your SDK

FastAuth provides two SDKs tailored for different frontend frameworks:

| SDK | Package | Use Case |
|-----|---------|----------|
| **Browser SDK** | `@fast-auth/browser-sdk` | Vanilla JavaScript, Vue, Svelte, or any web framework |
| **React SDK** | `@fast-auth/react-sdk` | React applications with hooks and context providers |

### Browser SDK

The Browser SDK provides a framework-agnostic `FastAuthClient` class that works with any JavaScript application. Use this if:

- You're building with vanilla JavaScript, TypeScript, Vue, Svelte, or Angular.
- You need full control over the authentication flow.
- You prefer a class-based API.

```bash
npm install @fast-auth/browser-sdk
```

### React SDK

The React SDK wraps the Browser SDK with React-specific features like hooks and context providers. Use this if:

- You're building a React application.
- You want to use hooks like `useFastAuth()`, `useIsLoggedIn()`, and `useSigner()`.
- You prefer declarative state management.

```bash
npm install @fast-auth/react-sdk
```

## 2. Select your Provider

**Providers** are platform-specific adapters that handle the authentication flow with your identity provider (e.g., Auth0). They abstract away the differences between web browsers and mobile platforms.

| Provider | Package | Platform |
|----------|---------|----------|
| **JavaScript Provider** | `@fast-auth/javascript-provider` | Web browsers |
| **React Native Provider** | `@fast-auth/react-native-provider` | iOS and Android apps |

### How SDKs and Providers work together

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your dApp     │────▶│   FastAuth SDK  │────▶│    Provider     │
│                 │     │ (Client/Signer) │     │ (Auth0 adapter) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Identity       │
                                               │  Provider       │
                                               │  (Auth0)        │
                                               └─────────────────┘
```

- **SDKs** provide the `FastAuthClient` and `FastAuthSigner` classes for authentication and signing.
- **Providers** handle platform-specific authentication (browser redirects vs. native app flows).

### Installation

For web applications:

```bash
npm install @fast-auth/browser-sdk @fast-auth/javascript-provider
```

For React web applications:

```bash
npm install @fast-auth/react-sdk @fast-auth/javascript-provider
```

For React Native applications:

```bash
npm install @fast-auth/react-sdk @fast-auth/react-native-provider
```

## 3. Authenticate your Users

### Initialize the Client

First, create a FastAuth client with your provider and configuration:

```typescript
import { FastAuthClient } from "@fast-auth/browser-sdk";
import { JavascriptProvider } from "@fast-auth/javascript-provider";
import { connect } from "near-api-js";

// Initialize the provider with your Auth0 credentials
const provider = new JavascriptProvider({
  domain: "your-tenant.auth0.com",
  clientId: "your-client-id",
  audience: "https://your-api-audience.com",
  redirectUri: window.location.origin,
});

// Connect to NEAR
const connection = await connect({
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
});

// Create the FastAuth client
const client = new FastAuthClient(provider, connection.connection, {
  fastAuthContractId: "fastauth.testnet",
  mpcContractId: "mpc.testnet",
});
```

### Login

Initiate the login flow. This redirects users to Auth0 for authentication:

```typescript
// Redirect to Auth0 login
await client.login();
```

After successful authentication, Auth0 redirects back to your application. Check if the user is logged in:

```typescript
// Check login status (call this on page load)
const isLoggedIn = await provider.isLoggedIn();

if (isLoggedIn) {
  console.log("User is authenticated!");
  // Proceed with your application logic
}
```

### Logout

Sign the user out and clear their session:

```typescript
await client.logout();
```

### React Example

Using the React SDK with hooks:

```tsx
import { FastAuthProvider, useFastAuth, useIsLoggedIn } from "@fast-auth/react-sdk";
import { JavascriptProvider } from "@fast-auth/javascript-provider";

// Wrap your app with the provider
function App() {
  const provider = new JavascriptProvider({
    domain: "your-tenant.auth0.com",
    clientId: "your-client-id",
    audience: "https://your-api-audience.com",
    redirectUri: window.location.origin,
  });

  return (
    <FastAuthProvider provider={provider} config={...}>
      <AuthenticatedApp />
    </FastAuthProvider>
  );
}

// Use hooks in your components
function AuthenticatedApp() {
  const { login, logout } = useFastAuth();
  const isLoggedIn = useIsLoggedIn();

  if (!isLoggedIn) {
    return <button onClick={login}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

## 4. Sign Transactions and Delegate Actions

Once users are authenticated, you can request signatures for NEAR transactions.

### Get a Signer

After login, obtain a signer instance:

```typescript
const signer = await client.getSigner();
```

### Request a Transaction Signature

To sign a transaction, create the transaction and request user approval:

```typescript
import { transactions } from "near-api-js";

// Build your transaction
const transaction = transactions.createTransaction(
  "sender.testnet",           // Sender account
  publicKey,                  // Sender's public key
  "receiver.testnet",         // Receiver account
  nonce,                      // Account nonce
  [                           // Actions
    transactions.transfer(BigInt("1000000000000000000000000")), // 1 NEAR
  ],
  blockHash                   // Recent block hash
);

// Request signature (redirects to Auth0 for approval)
await signer.requestTransactionSignature({
  transaction,
  name: "My dApp",
  imageUrl: "https://my-dapp.com/logo.png",
  redirectUri: window.location.origin + "/callback",
});
```

### Complete the Signing Flow

After the user approves, retrieve the signature and send the transaction:

```typescript
// On callback page, get the signature request
const signatureRequest = await signer.getSignatureRequest();

// Create the sign action for the FastAuth contract
const signAction = await signer.createSignAction(signatureRequest, {
  gas: 300000000000000n,
  deposit: 1n,
});

// Build and send the transaction to FastAuth
// The FastAuth contract will verify the JWT and return an MPC signature
```

### Request a Delegate Action Signature

For meta-transactions (gasless transactions), use delegate actions:

```typescript
import { buildDelegateAction } from "near-api-js/lib/transaction";

const delegateAction = buildDelegateAction({
  senderId: "sender.testnet",
  receiverId: "receiver.testnet",
  actions: [
    transactions.transfer(BigInt("1000000000000000000000000")),
  ],
  publicKey,
  nonce,
  maxBlockHeight,
});

// Request delegate action signature
await signer.requestDelegateActionSignature({
  delegateAction,
  name: "My dApp",
  imageUrl: "https://my-dapp.com/logo.png",
});
```

### Get the User's Public Key

Retrieve the user's derived public key for building transactions:

```typescript
// Get the Ed25519 public key (default)
const publicKey = await signer.getPublicKey();

// Or specify an algorithm
const secp256k1Key = await signer.getPublicKey("secp256k1");
```

## 5. Submit your Application

Before going to production, your application must be whitelisted to use FastAuth.

### Why Whitelisting?

- **Security**: Ensures only authorized applications can request signatures from users.
- **Rate Limiting**: Production credentials include appropriate rate limits for your use case.
- **Support**: Whitelisted applications receive priority support and monitoring.

### Approval Process

1. **Submit your application** for review with the following information:
   - Application name and description
   - Expected user volume
   - Use case details
   - Contact information

2. **Review**: The FastAuth team will review your application and may request additional information.

3. **Approval**: Once approved, you will receive:
   - Production Auth0 credentials (`domain`, `clientId`, `audience`)
   - Access to production FastAuth contracts
   - Documentation for production deployment

### Development vs. Production

| Environment | Purpose | Credentials |
|-------------|---------|-------------|
| **Testnet** | Development and testing | Use testnet credentials (no approval required) |
| **Mainnet** | Production applications | Requires whitelisting and approved credentials |

:::info
Contact the FastAuth team at [fastauth@near.org](mailto:fastauth@near.org) to submit your application for production access.
:::
