# Signer

The `FastAuthSigner` is the transaction handling component of the FastAuth Browser SDK. It manages all blockchain interactions, transaction signing, and account operations while integrating seamlessly with authentication providers and the NEAR blockchain.

## Overview

The `FastAuthSigner` serves as the bridge between authenticated users and the NEAR blockchain. It handles the complex process of creating, signing, and submitting transactions while leveraging Multi-Party Computation (MPC) for secure key management and authentication providers for user verification.

## Dependencies

### Configuration Types

```typescript
type FastAuthSignerOptions = {
    mpcContractId: string; // MPC contract for key derivation
    fastAuthContractId: string; // FastAuth contract for authentication
};

type CreateAccountOptions = {
    gas?: bigint; // Gas limit for account creation
    deposit?: bigint; // NEAR deposit amount
};

type SignatureRequest = {
    guardId: string; // Guard identifier
    verifyPayload: string; // Verification payload
    signPayload: Uint8Array; // Signing payload
};
```

## Constructor

```typescript
constructor(
    fastAuthProvider: P,
    connection: Connection,
    options: FastAuthSignerOptions
)
```

### Parameters

- **`fastAuthProvider`**: An instance implementing `IFastAuthProvider` interface
- **`connection`**: NEAR network connection from `near-api-js`
- **`options`**: Configuration object containing MPC and FastAuth contract IDs

## Initialization

### `init`

Initializes the signer by retrieving the cryptographic path from the provider.

- **Usage**: Must be called before using other signer methods
- **Behavior**: Retrieves and stores the derivation path from the authentication provider
- **Required**: Yes, called automatically by `FastAuthClient.getSigner()`

## Account Management

### `createAccount`

Creates a new NEAR account with the signer's derived public key.

```typescript
async createAccount(accountId: string, options?: CreateAccountOptions): Promise<Action>
```

- **Parameters**:
    - `accountId`: The desired account identifier
    - `options`: Optional gas and deposit configuration
- **Returns**: Promise resolving to a NEAR Action for account creation
- **Default Values**: 300TGas, 0 NEAR deposit
- **Usage**: Used for onboarding new users to the NEAR ecosystem

### `getPublicKey`

Retrieves the derived public key for the authenticated user.

```typescript
async getPublicKey(): Promise<PublicKey>
```

- **Returns**: Promise resolving to the user's derived public key
- **Process**:
    1. Calls MPC contract's `derived_public_key` method
    2. Uses the signer's path and FastAuth contract as predecessor
    3. Returns the computed public key

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
async createSignAction(request: SignatureRequest): Promise<Action>
```

- **Parameters**: Signature request with guard ID and payloads
- **Returns**: Promise resolving to a function call action
- **Contract Method**: Calls `sign` method on FastAuth contract
- **Cost**: 300TGas, 1 NEAR deposit

### `sendTransaction`

Signs and submits a transaction to the NEAR network.

```typescript
async sendTransaction(transaction: Transaction, signature: FastAuthSignature)
```

- **Parameters**:
    - `transaction`: The transaction to be signed and sent
    - `signature`: FastAuth MPC signature
- **Process**:
    1. Recovers the signature using elliptic curve cryptography
    2. Creates a signed transaction with SECP256K1 signature
    3. Submits to the NEAR network via the connection provider
- **Returns**: Transaction result from the network

## Contract Interaction

### `viewFunction` (Private)

Executes read-only contract function calls.

- **Purpose**: Query contract state without gas costs
- **Validation**: Ensures arguments are properly formatted
- **Encoding**: Converts arguments to base64-encoded JSON
- **Usage**: Internal method for contract queries

## Error Handling

The signer implements structured error handling:

### Error Types

- **`FastAuthSignerError`**: Base error class for signer operations
- **Error Codes**:
    - `INVALID_ARGUMENTS`: Thrown when function arguments are malformed

### Argument Validation

The signer validates function call arguments to ensure:

- Uint8Array types are preserved for binary data
- Object arguments are properly structured (not arrays or primitives)
- Invalid argument types trigger appropriate errors

## Usage Patterns

### Basic Transaction Flow

```typescript
// 1. Get signer from client (automatically initialized)
const signer = await client.getSigner();

// 2. Request transaction signature
await signer.requestTransactionSignature(transactionData);

// 3. Get signature request
const signatureRequest = await signer.getSignatureRequest();

// 4. Create sign action
const signAction = await signer.createSignAction(signatureRequest);

// 5. Build and send transaction
const transaction = buildTransaction(signAction);
const signature = FastAuthSignature.fromBase64(signatureData);
await signer.sendTransaction(transaction, signature);
```

### Account Creation Flow

```typescript
const signer = await client.getSigner();

// Create account action with custom options
const createAccountAction = await signer.createAccount("newuser.near", { gas: 100000000000000n, deposit: BigInt(parseNearAmount("0.1")!) });

// Include in transaction and submit
const transaction = buildTransactionWithActions([createAccountAction]);
await submitTransaction(transaction);
```

### Public Key Retrieval

```typescript
const signer = await client.getSigner();
const publicKey = await signer.getPublicKey();
console.log(`User's public key: ${publicKey.toString()}`);
```
