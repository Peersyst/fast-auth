# Client

The `FastAuthClient` is the main entry point for interacting with the FastAuth system in browser environments. It provides a high-level interface for authentication operations and transaction signing through various providers.

## Overview

The `FastAuthClient` is a generic TypeScript class that orchestrates authentication and signing operations by delegating to a configurable provider. It serves as an abstraction layer that standardizes the interface for different authentication providers while maintaining type safety.

## Dependencies

### Configuration Types

```typescript
type FastAuthClientOptions = {
    mpcContractId: string; // MPC contract address
    fastAuthContractId: string; // FastAuth contract address
};
```

## Constructor

```typescript
constructor(
    provider: P,
    connection: Connection,
    options: FastAuthClientOptions
)
```

- **`provider`**: An instance implementing `IFastAuthProvider` interface
- **`connection`**: NEAR network connection from `near-api-js`
- **`options`**: Configuration object containing contract IDs

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

### `getSigner`

Creates and returns a configured signer instance for transaction operations.

- **Returns**: Promise resolving to a `FastAuthSigner` instance
- **Throws**: `FastAuthClientError` with code `USER_NOT_LOGGED_IN` if user is not authenticated
- **Behavior**:
    1. Checks authentication status via `provider.isLoggedIn()`
    2. Creates a new `FastAuthSigner` instance if authenticated
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
import { FastAuthClient } from "@near/fast-auth-sdk";
import { connect } from "near-api-js";

// 1. Set up NEAR connection
const connection = await connect(nearConfig);

// 2. Create provider instance
const provider = new SomeAuthProvider(config);

// 3. Initialize client
const client = new FastAuthClient(provider, connection, {
    mpcContractId: "mpc.contract.near",
    fastAuthContractId: "fastauth.contract.near",
});

// 4. Authenticate
await client.login(/* provider-specific args */);

// 5. Get signer for transactions
const signer = await client.getSigner();
```

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
