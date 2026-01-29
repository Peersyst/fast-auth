# Usage

Learn how to use the FastAuth JavaScript Provider in your application.

## Overview

The JavaScript Provider is designed to be used with FastAuth SDKs. It implements the `IFastAuthProvider` interface and must be injected into a `FastAuthClient` from one of the FastAuth SDKs. The provider handles Auth0 authentication and transaction signing, while the SDK handles NEAR blockchain interactions.

## SDK Compatibility

The JavaScript Provider is compatible with the following FastAuth SDKs:

| SDK | Package | Compatibility | Notes |
|-----|---------|--------------|-------|
| Browser SDK | `@fast-auth-near/browser-sdk` | ✅ Fully Compatible | Designed for browser/web applications |
| React SDK | `@fast-auth-near/react-sdk` | ✅ Fully Compatible | Can be used with React applications |

## Basic Setup

First, install both the JavaScript Provider and your chosen SDK:

```bash
# Install the JavaScript Provider
npm install @fast-auth-near/javascript-provider

# Install your chosen SDK
npm install @fast-auth-near/browser-sdk
# or
npm install @fast-auth-near/react-sdk
```

Then, import and initialize the JavaScript Provider with your Auth0 configuration:

```javascript
import { JavascriptProvider } from '@fast-auth-near/javascript-provider';

const provider = new JavascriptProvider({
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    audience: 'your-auth0-audience',
});
```

## Integration with Browser SDK

### Setup

```javascript
import { FastAuthClient } from '@fast-auth-near/browser-sdk';
import { JavascriptProvider } from '@fast-auth-near/javascript-provider';
import { Connection } from 'near-api-js';

// 1. Set up NEAR connection
const connection = new Connection({
    networkId: 'testnet',
    provider: { type: 'JsonRpcProvider', args: { url: 'https://rpc.testnet.near.org' } },
});

// 2. Create JavaScript Provider instance
const provider = new JavascriptProvider({
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    audience: 'your-auth0-audience',
});

// 3. Initialize FastAuthClient with the provider
const client = new FastAuthClient(provider, connection, {
    mpcContractId: 'v1.signer-prod.testnet',
    fastAuthContractId: 'fast-auth-beta-001.testnet',
});
```

### Authentication

```javascript
// Login with popup (default - no redirectUri provided)
await client.login();

// Login with redirect (redirectUri provided)
await client.login({
    redirectUri: window.location.origin,
});

// Check authentication status
const isLoggedIn = await client.isLoggedIn();

// Logout
await client.logout();
```

### Transaction Signing

```javascript
// Get signer
const signer = await client.getSigner();

// Request transaction signature
await signer.requestTransactionSignature({
    transaction: myTransaction,
    imageUrl: 'https://example.com/icon.png',
    name: 'My dApp',
    redirectUri: window.location.origin + '/callback', // Optional
});

// Get signature request after callback
const signatureRequest = await signer.getSignatureRequest();
```

## Integration with React SDK

### Setup

```javascript
import { FastAuthProvider } from '@fast-auth-near/react-sdk';
import { JavascriptProvider } from '@fast-auth-near/javascript-provider';
import { Connection } from 'near-api-js';

const connection = new Connection({
    networkId: 'testnet',
    provider: { type: 'JsonRpcProvider', args: { url: 'https://rpc.testnet.near.org' } },
});

function App() {
    const providerConfig = {
        provider: new JavascriptProvider({
            domain: 'your-auth0-domain.auth0.com',
            clientId: 'your-auth0-client-id',
            audience: 'your-auth0-audience',
        }),
    };

    return (
        <FastAuthProvider
            providerConfig={providerConfig}
            connection={connection}
            network="testnet"
        >
            <YourApp />
        </FastAuthProvider>
    );
}
```

### Using Hooks

```javascript
import { useFastAuth, useSigner } from '@fast-auth-near/react-sdk';

function MyComponent() {
    const { client, isReady } = useFastAuth();
    const { signer } = useSigner();

    const handleLogin = async () => {
        if (client) {
            // Login with popup (default)
            await client.login();
            
            // Or login with redirect
            await client.login({
                redirectUri: window.location.origin,
            });
        }
    };

    const handleSignTransaction = async (transaction) => {
        if (signer) {
            await signer.requestTransactionSignature({
                transaction,
                imageUrl: 'https://example.com/icon.png',
                name: 'My dApp',
            });
        }
    };

    return (
        <div>
            <button onClick={handleLogin}>Login</button>
            <button onClick={() => client?.logout()}>Logout</button>
        </div>
    );
}
```

## Login Flow Selection

The JavaScript Provider automatically chooses between redirect and popup flow based on the options provided to `login()`:

- **Popup Flow (Default)**: If no `redirectUri` is provided, the popup flow is used
- **Redirect Flow**: If `redirectUri` is provided in the options, the redirect flow is used

```javascript
// Popup flow (default)
await client.login();

// Redirect flow
await client.login({
    redirectUri: window.location.origin,
});
```

## Configuration Options

The JavaScript Provider accepts the following configuration options:

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `domain` | `string` | Your Auth0 domain (e.g., 'your-app.auth0.com') | Yes |
| `clientId` | `string` | Your Auth0 application client ID | Yes |
| `audience` | `string` | Auth0 API audience identifier | Yes |

Note: `redirectUri` is not part of the constructor options. It should be provided when calling `login()` with redirect flow.
