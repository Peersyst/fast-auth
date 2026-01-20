# Sign Transactions and Delegate Actions

Once users are authenticated, you can request signatures for NEAR transactions. For detailed API reference, see the [Browser SDK Signer](../sdk/browser/signer) or [React SDK Signer](../sdk/react/signer) documentation.

## Get a Signer

After login, obtain a signer instance:

```typescript
const signer = await client.getSigner();
```

The signer is used to request signatures and interact with the FastAuth contracts. Learn more about the [signing architecture](../concepts/architecture_mpc).

## Request a Transaction Signature

:::info
When using `requestTransactionSignature` or `requestDelegateActionSignature`, be aware that these methods may trigger a browser redirection or open a pop-up window, depending on the SDK and the authentication provider you have integrated. Make sure to design your app's UX to handle and inform users about these context switches appropriately.
:::


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

## Complete the Signing Flow

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

For more details on how the FastAuth contract processes signatures, see the [FastAuth Contract documentation](../concepts/architecture_contracts_fa).

## Request a Delegate Action Signature

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

## Get the User's Public Key

Retrieve the user's derived public key for building transactions:

```typescript
// Get the Ed25519 public key (default)
const publicKey = await signer.getPublicKey();

// Or specify an algorithm
const secp256k1Key = await signer.getPublicKey("secp256k1");
```

The public key is derived from the user's authentication path using the MPC network.
