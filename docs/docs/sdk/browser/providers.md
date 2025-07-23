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
};
```

## Auth0Provider

The `Auth0Provider` is the default implementation that integrates with Auth0 for authentication and uses JWT tokens for transaction signing. It leverages Auth0's robust authentication infrastructure to provide secure user management while enabling NEAR transaction signing through JWT-based verification.

### Setup

To get started with the Auth0Provider, you'll need to create an Auth0 application and configure it properly. The provider handles the OAuth flow and JWT token management automatically.

```typescript
import { Auth0Provider } from "@near/fast-auth-sdk/browser";

const provider = new Auth0Provider({
    domain: "your-auth0-domain.auth0.com",
    clientId: "your-auth0-client-id",
    redirectUri: "http://localhost:3000/callback",
    audience: "your-auth0-audience",
});
```

### Configuration Options

These configuration options are required to establish the connection between your application and your Auth0 tenant. Each option serves a specific purpose in the OAuth flow and JWT verification process.

```typescript
type Auth0ProviderOptions = {
    domain: string; // Your Auth0 domain
    clientId: string; // Your Auth0 application client ID
    redirectUri: string; // Callback URL after authentication
    audience: string; // Auth0 API identifier
};
```

### Usage Example

This example demonstrates the typical authentication and transaction signing flow with the Auth0Provider. The flow involves checking authentication status, logging in if necessary, and then requesting transaction signatures.

```typescript
// Check if user is logged in
const isLoggedIn = await provider.isLoggedIn();

if (!isLoggedIn) {
    // Initiate login
    await provider.login();
} else {
    // User is authenticated, request transaction signature
    await provider.requestTransactionSignature({
        transaction: myTransaction,
        imageUrl: "https://example.com/app-icon.png",
        name: "My DApp",
        redirectUri: "http://localhost:3000/success",
    });

    // Get the signature request after callback
    const signatureRequest = await provider.getSignatureRequest();
}
```

### Auth0-Specific Features

The Auth0Provider includes several features that are specifically designed to work with Auth0's authentication service and provide a seamless integration experience.

- **JWT Token Management**: Automatically handles Auth0 JWT tokens
- **Silent Authentication**: Supports silent token renewal
- **Redirect-based Flow**: Uses Auth0's redirect flow for authentication
- **Custom Authorization Parameters**: Supports passing transaction data through Auth0's authorization flow

### Request Signature Options

When requesting transaction or delegate action signatures, you can provide additional metadata that will be displayed to the user during the approval process. This helps users understand what they're signing and which application is requesting the signature.

```typescript
// For transaction signatures
type Auth0RequestTransactionSignatureOptions = {
    imageUrl: string; // App icon URL
    name: string; // App name
    redirectUri?: string; // Optional override for redirect URI
    transaction: Transaction; // NEAR transaction object
};

// For delegate action signatures
type Auth0RequestDelegateActionSignatureOptions = {
    imageUrl: string; // App icon URL
    name: string; // App name
    redirectUri?: string; // Optional override for redirect URI
    delegateAction: DelegateAction; // Delegate action object
};
```

## Creating a Custom Backend Provider

You can create your own provider by implementing the `IFastAuthProvider` interface. This allows you to integrate with any authentication backend or custom signing flow.

### Basic Implementation Template

```typescript
import { IFastAuthProvider } from "@near/fast-auth-sdk/browser";
import { SignatureRequest } from "@near/fast-auth-sdk/browser";

export class CustomProvider implements IFastAuthProvider {
    private options: YourProviderOptions;

    constructor(options: YourProviderOptions) {
        this.options = options;
    }

    async login(): Promise<void> {
        // Implement your login logic
        // This could be a redirect, popup, API call, etc.
    }

    async logout(): Promise<void> {
        // Clear session data and logout
    }

    async isLoggedIn(): Promise<boolean> {
        // Check authentication status
        // Handle callback parameters if using redirects
        return false; // Implement your logic
    }

    async getPath(): Promise<string> {
        // Return derivation path for the user
        // Format: "jwt#<issuer>#<subject>"
        return `jwt#${this.options.issuer}#${userId}`;
    }

    async requestTransactionSignature(options: YourSignatureOptions): Promise<void> {
        // Redirect or show UI for transaction approval
    }

    async requestDelegateActionSignature(options: YourSignatureOptions): Promise<void> {
        // Redirect or show UI for delegate action approval
    }

    async getSignatureRequest(): Promise<SignatureRequest> {
        // Parse callback data and return signature request
        return {
            guardId: "your-guard-contract-id",
            verifyPayload: "jwt-token-or-verification-data",
            signPayload: new Uint8Array(/* transaction bytes */),
        };
    }
}
```

### Key Considerations

1. **Authentication Flow**: Decide whether to use redirects, popups, or inline authentication
2. **Token Management**: Handle token storage, renewal, and validation
3. **Error Handling**: Implement proper error handling and user feedback
4. **Security**: Ensure secure token transmission and storage
5. **Guard Contract**: Your backend must work with a compatible guard contract

### Integration with FastAuth Client

Once you've implemented your custom provider, you can use it with the FastAuth client:

```typescript
import { FastAuthClient } from "@near/fast-auth-sdk/browser";
import { CustomProvider } from "./custom-provider";

const provider = new CustomProvider({
    authEndpoint: "https://your-auth-backend.com",
    guardId: "your-guard.near",
    issuer: "https://your-auth-backend.com",
});

const client = new FastAuthClient({
    provider,
    // other options...
});
```

This flexibility allows you to integrate FastAuth with any authentication system while maintaining a consistent interface for your application.
