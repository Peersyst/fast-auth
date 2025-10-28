# API Reference

Complete API reference for the FastAuth JavaScript Provider.

## JavascriptProvider

The main class for interacting with FastAuth using Auth0 authentication.

### Constructor

```typescript
new JavascriptProvider(options: JavascriptProviderOptions)
```

#### Parameters

- `options` - Configuration object with Auth0 credentials

#### Example

```javascript
import { JavascriptProvider } from '@fast-auth/javascript-provider';

const provider = new JavascriptProvider({
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    redirectUri: window.location.origin,
    audience: 'your-auth0-audience',
});
```

## Methods

### login

Redirects the user to the Auth0 login page for authentication.

```typescript
login(): Promise<void>
```

#### Returns

Promise that resolves when the redirect is initiated.

#### Example

```javascript
await provider.login();
// User will be redirected to Auth0 login
```

---

### logout

Logs out the current user and clears the Auth0 session.

```typescript
logout(): Promise<void>
```

#### Example

```javascript
await provider.logout();
```

---

### isLoggedIn

Checks if the user is currently authenticated. This method also handles the redirect callback from Auth0.

```typescript
isLoggedIn(): Promise<boolean>
```

#### Returns

Promise that resolves to `true` if authenticated, `false` otherwise.

#### Example

```javascript
const isLoggedIn = await provider.isLoggedIn();
if (isLoggedIn) {
    console.log('User is authenticated');
}
```

---

### getPath

Gets the NEAR path identifier for the authenticated user.

```typescript
getPath(): Promise<string>
```

#### Returns

Promise that resolves to a path string in the format: `jwt#https://{domain}/#${sub}`.

#### Throws

`JavascriptProviderError` with code `USER_NOT_LOGGED_IN` if the user is not authenticated.

#### Example

```javascript
try {
    const path = await provider.getPath();
    console.log('User path:', path);
} catch (error) {
    console.error('User not logged in');
}
```

---

### requestTransactionSignature

Requests a signature for a NEAR transaction by redirecting the user to approve it.

```typescript
requestTransactionSignature(
    options: JavascriptRequestTransactionSignatureOptions
): Promise<void>
```

#### Parameters

- `options.transaction` - The NEAR transaction to sign
- `options.imageUrl` - URL of the dApp icon/logo
- `options.name` - Name of the dApp
- `options.redirectUri` (optional) - Custom redirect URI after signing

#### Example

```javascript
import { Transaction } from 'near-api-js/lib/transaction';

await provider.requestTransactionSignature({
    transaction: myTransaction,
    imageUrl: 'https://example.com/logo.png',
    name: 'My dApp',
    redirectUri: 'https://example.com/callback',
});
```

---

### requestDelegateActionSignature

Requests a signature for a NEAR delegate action by redirecting the user to approve it.

```typescript
requestDelegateActionSignature(
    options: JavascriptRequestDelegateActionSignatureOptions
): Promise<void>
```

#### Parameters

- `options.delegateAction` - The delegate action to sign
- `options.imageUrl` - URL of the dApp icon/logo
- `options.name` - Name of the dApp
- `options.redirectUri` (optional) - Custom redirect URI after signing

#### Example

```javascript
import { DelegateAction } from '@near-js/transactions';

await provider.requestDelegateActionSignature({
    delegateAction: myDelegateAction,
    imageUrl: 'https://example.com/logo.png',
    name: 'My dApp',
});
```

---

### getSignatureRequest

Retrieves the signature request from the JWT token after authentication.

```typescript
getSignatureRequest(): Promise<SignatureRequest>
```

#### Returns

Promise that resolves to a `SignatureRequest` object containing the signature details.

#### Example

```javascript
const signatureRequest = await provider.getSignatureRequest();
console.log('Guard ID:', signatureRequest.guardId);
console.log('Verify Payload:', signatureRequest.verifyPayload);
```

## Types

### JavascriptProviderOptions

Configuration options for the provider.

```typescript
interface JavascriptProviderOptions {
    domain: string;
    clientId: string;
    redirectUri: string;
    audience: string;
}
```

**Properties:**

- `domain` - Your Auth0 domain (e.g., 'your-app.auth0.com')
- `clientId` - Your Auth0 application client ID
- `redirectUri` - URL to redirect after authentication
- `audience` - Auth0 API audience identifier

---

### JavascriptRequestTransactionSignatureOptions

Options for requesting a transaction signature.

```typescript
interface JavascriptRequestTransactionSignatureOptions {
    transaction: Transaction;
    imageUrl: string;
    name: string;
    redirectUri?: string;
}
```

**Properties:**

- `transaction` - NEAR transaction object to sign
- `imageUrl` - URL of the dApp icon/logo
- `name` - Name of the dApp
- `redirectUri` - (Optional) Custom redirect URI

---

### JavascriptRequestDelegateActionSignatureOptions

Options for requesting a delegate action signature.

```typescript
interface JavascriptRequestDelegateActionSignatureOptions {
    delegateAction: DelegateAction;
    imageUrl: string;
    name: string;
    redirectUri?: string;
}
```

**Properties:**

- `delegateAction` - NEAR delegate action to sign
- `imageUrl` - URL of the dApp icon/logo
- `name` - Name of the dApp
- `redirectUri` - (Optional) Custom redirect URI

---

### SignatureRequest

Represents a signature request returned after authentication.

```typescript
interface SignatureRequest {
    guardId: string;
    verifyPayload: string;
    signPayload: Uint8Array;
    algorithm?: MPCContractAlgorithm;
}
```

**Properties:**

- `guardId` - The guard identifier
- `verifyPayload` - JWT token for verification
- `signPayload` - The payload to be signed
- `algorithm` - (Optional) The signing algorithm

---

### MPCContractAlgorithm

Supported signing algorithms.

```typescript
type MPCContractAlgorithm = "secp256k1" | "eddsa" | "ecdsa";
```

## Error Handling

### JavascriptProviderError

Custom error class thrown by the provider.

```typescript
class JavascriptProviderError extends Error {
    constructor(code: JavascriptProviderErrorCodes)
}
```

### JavascriptProviderErrorCodes

Error codes used by the provider.

```typescript
enum JavascriptProviderErrorCodes {
    USER_NOT_LOGGED_IN = "USER_NOT_LOGGED_IN"
}
```

#### Example

```javascript
import { 
    JavascriptProviderError, 
    JavascriptProviderErrorCodes 
} from '@fast-auth/javascript-provider';

try {
    const path = await provider.getPath();
} catch (error) {
    if (error instanceof JavascriptProviderError) {
        if (error.message === JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN) {
            console.log('Please log in first');
        }
    }
}
```

