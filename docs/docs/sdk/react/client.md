# Client

The `FastAuthClient` is the main entry point for interacting with the FastAuth system in React applications. It provides a high-level interface for authentication operations and transaction signing through various providers, with automatic contract configuration based on network selection.

## Overview

The `FastAuthClient` is a generic TypeScript class that orchestrates authentication and signing operations by delegating to a configurable provider. It serves as an abstraction layer that standardizes the interface for different authentication providers while maintaining type safety. The React SDK version automatically configures contract addresses based on the selected network.

## Dependencies

### Configuration Types

```typescript
type FastAuthClientNetwork = "mainnet" | "testnet";

type FastAuthContracts = {
    mpcContractId: string; // MPC contract address
    fastAuthContractId: string; // FastAuth contract address
};
```

## Constructor

```typescript
constructor(
    provider: P,
    connection: Connection,
    network: FastAuthClientNetwork,
    relayerURL: string
)
```

- **`provider`**: An instance implementing `IFastAuthProvider` interface
- **`connection`**: NEAR network connection from `near-api-js`
- **`network`**: Network identifier ("mainnet" or "testnet") - automatically configures contract addresses
- **`relayerURL`**: URL of the FastAuth relayer service for transaction relaying

## Methods

### `login`

Initiates the authentication process using the configured provider.

- **Parameters**: Variable arguments that are passed directly to the provider's login method
- **Returns**: Result from the provider's login implementation (typically void)
- **Usage**: Delegates to `provider.login()` with all provided arguments

### `logout`

Terminates the user session.

- **Returns**: Result from the provider's logout implementation (typically void)
- **Usage**: Delegates to `provider.logout()`

### `isLoggedIn`

Checks if the user is currently authenticated.

- **Returns**: Promise resolving to a boolean indicating authentication status
- **Usage**: Delegates to `provider.isLoggedIn()`
- **Behavior**: Checks authentication status through the configured provider

### `getSigner`

Creates and returns a configured signer instance for transaction operations.

- **Returns**: Promise resolving to a `FastAuthSigner` instance
- **Throws**: `FastAuthClientError` with code `USER_NOT_LOGGED_IN` if user is not authenticated
- **Behavior**:
    1. Checks authentication status via `provider.isLoggedIn()`
    2. Creates a new `FastAuthSigner` instance if authenticated (with relayer support)
    3. Initializes the signer before returning

## Provider Interface

```typescript
interface IFastAuthProvider {
    // Base signer provider methods
    isLoggedIn(): Promise<boolean>;
    requestTransactionSignature(...args: any[]): Promise<void>;
    requestDelegateActionSignature(...args: any[]): Promise<void>;
    getSignatureRequest(): Promise<SignatureRequest>;
    getPath(): Promise<string>;

    // Client-specific methods
    login(...args: any[]): void;
    logout(): void;
}
```

## Usage

### Client instantiation

```typescript
import { FastAuthClient } from "@fast-auth/react-sdk";
import { Connection } from "near-api-js";

// 1. Set up NEAR connection
const connection = new Connection({
    networkId: "testnet",
    provider: { type: "JsonRpcProvider", args: { url: "https://rpc.testnet.near.org" } },
});

// 2. Create provider instance
const provider = new SomeAuthProvider(config);

// 3. Initialize client with network and relayer URL
const client = new FastAuthClient(
    provider,
    connection,
    "testnet", // Network automatically configures contract addresses
    "https://relayer.example.com/api/relayer/fast-auth" // Relayer URL
);

// 4. Authenticate
await client.login(/* provider-specific args */);

// 5. Check login status
const isLoggedIn = await client.isLoggedIn();

// 6. Get signer for transactions
const signer = await client.getSigner();
```

### Network Configuration

The React SDK automatically configures contract addresses based on the network:

- **testnet**: 
  - `mpcContractId`: `"v1.signer-prod.testnet"`
  - `fastAuthContractId`: `"fast-auth-beta-001.testnet"`
- **mainnet**:
  - `mpcContractId`: `"v1.signer"`
  - `fastAuthContractId`: `"fast-auth.near"`

### Error Handling

```typescript
try {
    const signer = await client.getSigner();
    // Use signer for transactions
} catch (error) {
    if (error instanceof FastAuthClientError) {
        // Handle authentication errors
        console.error("Authentication required:", error.message);
    }
}
```
