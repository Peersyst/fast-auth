# Signer

The `FastAuthSigner` is the transaction handling component of the FastAuth React SDK. It manages all blockchain interactions, transaction signing, and account operations while integrating seamlessly with authentication providers, the NEAR blockchain, and the FastAuth relayer service.

## Overview

The `FastAuthSigner` serves as the bridge between authenticated users and the NEAR blockchain. It handles the complex process of creating, signing, and submitting transactions while leveraging Multi-Party Computation (MPC) for secure key management and authentication providers for user verification. The React SDK version includes integrated relayer support for gasless transactions and simplified account creation.

## Dependencies

### Configuration Types

```typescript
type FastAuthSignerOptions = {
    mpcContractId: string; // MPC contract for key derivation
    fastAuthContractId: string; // FastAuth contract for authentication
};

type CreateAccountOptions = {
    algorithm?: Algorithm; // Algorithm to use (default: "ed25519")
};

type SignatureRequest = {
    guardId: string; // Guard identifier
    verifyPayload: string; // Verification payload
    signPayload: Uint8Array; // Signing payload
    algorithm?: MPCContractAlgorithm; // Optional algorithm specification
};

type Algorithm = "secp256k1" | "ed25519";
type MPCContractAlgorithm = "secp256k1" | "eddsa" | "ecdsa";

type SignAndSendTransactionOptions<P extends IFastAuthProvider> = Parameters<P["requestTransactionSignature"]> & {
    algorithm?: MPCContractAlgorithm;
    transaction: Transaction;
};

type SignAndSendDelegateActionOptions<P extends IFastAuthProvider> = Parameters<P["requestDelegateActionSignature"]> & {
    algorithm?: MPCContractAlgorithm;
    receiverId: string;
};
```

## Constructor

```typescript
constructor(
    fastAuthProvider: P,
    connection: Connection,
    options: FastAuthSignerOptions,
    relayerURL: string
)
```

### Parameters

- **`fastAuthProvider`**: An instance implementing `IFastAuthProvider` interface
- **`connection`**: NEAR network connection from `near-api-js`
- **`options`**: Configuration object containing MPC and FastAuth contract IDs (automatically set by FastAuthClient)
- **`relayerURL`**: URL of the FastAuth relayer service

## Initialization

### `init`

Initializes the signer by retrieving the cryptographic path from the provider.

- **Usage**: Must be called before using other signer methods
- **Behavior**: Retrieves and stores the derivation path from the authentication provider
- **Required**: Yes, called automatically by `FastAuthClient.getSigner()`

## Account Management

### `createAccount`

Creates a new NEAR account with the signer's derived public key via the relayer service.

```typescript
async createAccount(accountId: string, options?: CreateAccountOptions): Promise<string>
```

- **Parameters**:
    - `accountId`: The desired account identifier
    - `options`: Optional algorithm configuration (default: "ed25519")
- **Returns**: Promise resolving to the transaction hash
- **Usage**: Used for onboarding new users to the NEAR ecosystem
- **Note**: This method uses the relayer service, so gas and deposit are handled automatically

### `getPublicKey`

Retrieves the derived public key for the authenticated user.

```typescript
async getPublicKey(algorithm?: Algorithm): Promise<PublicKey>
```

- **Parameters**:
    - `algorithm`: Optional algorithm to use (default: "ed25519")
- **Returns**: Promise resolving to the user's derived public key
- **Process**:
    1. Calls MPC contract's `derived_public_key` method
    2. Uses the signer's path and FastAuth contract as predecessor
    3. Uses the specified algorithm's domain ID for key derivation
    4. Returns the computed public key

## Transaction Operations

### `requestTransactionSignature`

Initiates a transaction signature request through the authentication provider.

```typescript
async requestTransactionSignature(...args: Parameters<P["requestTransactionSignature"]>)
```

- **Parameters**: Variable arguments passed to the provider's implementation
- **Usage**: Delegates to the provider for user consent and signature generation
- **Flow**: Provider → User Interface → Signature Generation

### `requestDelegateActionSignature`

Initiates a delegate action signature request for gasless transactions.

```typescript
async requestDelegateActionSignature(...args: Parameters<P["requestDelegateActionSignature"]>)
```

- **Parameters**: Variable arguments passed to the provider's implementation
- **Usage**: Enables meta-transactions where gas is paid by a relayer
- **Benefit**: Improves user experience by removing gas payment friction

### `getSignatureRequest`

Retrieves the current signature request from the authentication provider.

```typescript
getSignatureRequest(): Promise<SignatureRequest>
```

- **Returns**: Promise resolving to the pending signature request
- **Contains**: Guard ID, verification payload, and signing payload
- **Usage**: Used to check signature request status and retrieve payloads

## Signing and Submission

### `createSignAction`

Creates a NEAR action for signing operations on the FastAuth contract.

```typescript
async createSignAction(request: SignatureRequest, options?: CreateSignActionOptions): Promise<Action>
```

- **Parameters**:
    - `request`: Signature request with guard ID, payloads, and optional algorithm
    - `options`: Optional gas and deposit configuration
- **Returns**: Promise resolving to a function call action
- **Contract Method**: Calls `sign` method on FastAuth contract
- **Default Values**: 300TGas, 0 NEAR deposit
- **Algorithm**: Defaults to "eddsa" if not specified in the request

### `signAndSendTransaction`

Signs a transaction and relays it through the FastAuth relayer service.

```typescript
async signAndSendTransaction(opts: SignAndSendTransactionOptions<P>): Promise<FinalExecutionOutcome>
```

- **Parameters**:
    - `opts`: Options object containing transaction, algorithm, and provider-specific signature request parameters
- **Process**:
    1. Requests transaction signature from the provider
    2. Retrieves signature request
    3. Relays signature request to the relayer service
    4. Recovers signature from relayer response
    5. Signs and submits transaction to the NEAR network
- **Returns**: Final execution outcome from the network
- **Usage**: Simplified method for signing and sending transactions with automatic relayer integration

### `signAndSendDelegateAction`

Signs a delegate action and relays it through the FastAuth relayer service for gasless transactions.

```typescript
async signAndSendDelegateAction(opts: SignAndSendDelegateActionOptions<P>): Promise<FinalExecutionOutcome>
```

- **Parameters**:
    - `opts`: Options object containing receiverId, algorithm, and provider-specific signature request parameters
- **Process**:
    1. Requests delegate action signature from the provider
    2. Retrieves signature request
    3. Relays signature request to the relayer service
    4. Returns the execution outcome
- **Returns**: Final execution outcome from the network
- **Usage**: Enables gasless transactions where gas is paid by the relayer

### `sendTransaction`

Signs and submits a transaction to the NEAR network.

```typescript
async sendTransaction(transaction: Transaction, signature: FastAuthSignature, algorithm?: Algorithm): Promise<FinalExecutionOutcome>
```

- **Parameters**:
    - `transaction`: The transaction to be signed and sent
    - `signature`: FastAuth MPC signature
    - `algorithm`: Optional algorithm to use for signature recovery (default: "ed25519")
- **Process**:
    1. Recovers the signature using the specified algorithm (ed25519 or secp256k1)
    2. Creates a signed transaction with the appropriate key type
    3. Submits to the NEAR network via the connection provider
- **Returns**: Transaction result from the network

## Contract Interaction

### `viewFunction` (Private)

Executes read-only contract function calls.

- **Purpose**: Query contract state without gas costs
- **Validation**: Ensures arguments are properly formatted
- **Encoding**: Converts arguments to base64-encoded JSON
- **Usage**: Internal method for contract queries
