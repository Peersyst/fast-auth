# Providers

Providers are the core components that handle authentication and transaction signing in the FastAuth Browser SDK. They implement the `IFastAuthProvider` interface and manage the communication between your application and the authentication backend.

## FastAuthProvider Interface

The `IFastAuthProvider` interface defines the contract that all providers must implement. It extends the signer provider interface and adds authentication-specific methods.

### Interface Definition

```typescript
interface IFastAuthProvider {
    // Authentication methods
    login(...args: any[]): void;
    logout(): void;
    isLoggedIn(): Promise<boolean>;

    // Transaction signing methods
    requestTransactionSignature(...args: any[]): Promise<void>;
    requestDelegateActionSignature(...args: any[]): Promise<void>;

    // Utility methods
    getSignatureRequest(): Promise<SignatureRequest>;
    getPath(): Promise<string>;
}
```

### Methods

#### Authentication Methods

- **`login(...args: any[]): void`**

    - Initiates the login process for the user
    - Implementation varies by provider (e.g., redirect, popup, etc.)

- **`logout(): void`**

    - Logs out the current user and clears session data

- **`isLoggedIn(): Promise<boolean>`**
    - Returns whether the user is currently authenticated
    - Should handle URL callback parameters and session validation

#### Transaction Signing Methods

- **`requestTransactionSignature(...args: any[]): Promise<void>`**

    - Requests a signature for a NEAR transaction
    - Typically redirects to the authentication provider for approval

- **`requestDelegateActionSignature(...args: any[]): Promise<void>`**
    - Requests a signature for a delegate action
    - Used for meta-transactions and sponsored transactions

#### Utility Methods

- **`getSignatureRequest(): Promise<SignatureRequest>`**

    - Retrieves the signature request data after authentication
    - Returns an object with `guardId`, `verifyPayload`, and `signPayload`

- **`getPath(): Promise<string>`**
    - Returns the derivation path for the user's account
    - Used to generate deterministic account addresses

### SignatureRequest Type

```typescript
type SignatureRequest = {
    guardId: string; // Identifier for the guard contract
    verifyPayload: string; // JWT or verification data
    signPayload: Uint8Array; // Transaction data to be signed
    algorithm?: MPCContractAlgorithm; // Optional algorithm specification
};

type MPCContractAlgorithm = "secp256k1" | "eddsa" | "ecdsa";
```
