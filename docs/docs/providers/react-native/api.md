# API Reference

Complete API reference for the FastAuth React Native Provider.

## ReactNativeProvider

The main class for interacting with FastAuth using Auth0 authentication in React Native applications.

### Constructor

```typescript
new ReactNativeProvider(options: ReactNativeProviderOptions)
```

#### Parameters

- `options` - Configuration object with Auth0 credentials and app metadata

#### Example

```javascript
import { ReactNativeProvider } from '@fast-auth/react-native-provider';

const provider = new ReactNativeProvider({
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    audience: 'your-auth0-audience', // Optional
    imageUrl: 'https://example.com/icon.png',
    name: 'My dApp',
});
```

## Methods

### login

Authenticates the user using Web Authentication (system browser).

```typescript
login(): Promise<void>
```

#### Returns

Promise that resolves when authentication is complete. Credentials are automatically saved.

#### Example

```javascript
await provider.login();
// User will be redirected to Auth0 login via system browser
```

---

### logout

Logs out the current user and clears stored credentials.

```typescript
logout(): Promise<void>
```

#### Behavior

- Clears the session on Auth0's servers
- Clears local credentials
- Throws error if clearing remote session fails, but still clears local credentials

#### Example

```javascript
await provider.logout();
```

---

### isLoggedIn

Checks if the user is currently authenticated by verifying if valid credentials exist.

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

- `ReactNativeProviderError` with code `CREDENTIALS_NOT_FOUND` if credentials are not found
- `ReactNativeProviderError` with code `INVALID_TOKEN` if the token is invalid

#### Example

```javascript
try {
    const path = await provider.getPath();
    console.log('User path:', path);
} catch (error) {
    console.error('Failed to get path:', error);
}
```

---

### requestTransactionSignature

Requests a signature for a NEAR transaction by initiating a new authorization flow.

```typescript
requestTransactionSignature(
    options: ReactNativeRequestTransactionSignatureOptions
): Promise<void>
```

#### Parameters

- `options.transaction` - The NEAR transaction to sign
- `options.imageUrl` - URL of the dApp icon/logo
- `options.name` - Name of the dApp

#### Returns

Promise that resolves when the authorization flow is initiated. Credentials are automatically saved after approval.

#### Example

```javascript
import { Transaction } from 'near-api-js/lib/transaction';

await provider.requestTransactionSignature({
    transaction: myTransaction,
    imageUrl: 'https://example.com/logo.png',
    name: 'My dApp',
});
```

---

### requestDelegateActionSignature

Requests a signature for a NEAR delegate action by initiating a new authorization flow.

```typescript
requestDelegateActionSignature(
    options: ReactNativeRequestDelegateActionSignatureOptions
): Promise<void>
```

#### Parameters

- `options.delegateAction` - The delegate action to sign
- `options.imageUrl` - URL of the dApp icon/logo
- `options.name` - Name of the dApp

#### Returns

Promise that resolves when the authorization flow is initiated. Credentials are automatically saved after approval.

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

Retrieves the signature request from the current session.

```typescript
getSignatureRequest(): Promise<SignatureRequest>
```

#### Returns

Promise that resolves to a `SignatureRequest` object containing:
- `guardId` - The JWT guard identifier
- `verifyPayload` - The access token (used for verification)
- `signPayload` - The transaction/delegate action payload to sign

#### Throws

`ReactNativeProviderError` with code `CREDENTIALS_NOT_FOUND` if credentials are not found.

#### Example

```javascript
const signatureRequest = await provider.getSignatureRequest();
console.log('Guard ID:', signatureRequest.guardId);
console.log('Verify Payload:', signatureRequest.verifyPayload);
```

## Helper Functions

### reactNativeProviderConfig

Helper function to configure the provider for use with the React SDK.

```typescript
reactNativeProviderConfig(
    opts: ReactNativeProviderOptions
): FastAuthProviderConfig
```

#### Parameters

- `opts` - ReactNativeProvider options

#### Returns

Configuration object with `provider` and `reactProvider` for use with `FastAuthProvider`.

#### Example

```javascript
import { reactNativeProviderConfig } from '@fast-auth/react-native-provider';
import { FastAuthProvider } from '@fast-auth/react-sdk';

const providerConfig = reactNativeProviderConfig({
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    audience: 'your-auth0-audience',
    imageUrl: 'https://example.com/icon.png',
    name: 'My dApp',
});

<FastAuthProvider providerConfig={providerConfig} ...>
    <YourApp />
</FastAuthProvider>
```

## Types

### ReactNativeProviderOptions

Configuration options for the provider.

```typescript
type ReactNativeProviderOptions = AppOptions & Auth0Options & {
    audience?: string;
};

type AppOptions = {
    imageUrl: string;
    name: string;
};
```

**Properties:**

- `domain` - Your Auth0 domain (e.g., 'your-app.auth0.com')
- `clientId` - Your Auth0 application client ID
- `audience` - (Optional) Auth0 API audience identifier
- `imageUrl` - URL of the dApp icon/logo
- `name` - Name of the dApp
- Other `Auth0Options` from `react-native-auth0`

---

### ReactNativeRequestTransactionSignatureOptions

Options for requesting a transaction signature.

```typescript
type ReactNativeRequestTransactionSignatureOptions = ReactNativeBaseRequestSignatureOptions & {
    transaction: Transaction;
};

type ReactNativeBaseRequestSignatureOptions = {
    imageUrl: string;
    name: string;
};
```

**Properties:**

- `transaction` - NEAR transaction object to sign
- `imageUrl` - URL of the dApp icon/logo
- `name` - Name of the dApp

---

### ReactNativeRequestDelegateActionSignatureOptions

Options for requesting a delegate action signature.

```typescript
type ReactNativeRequestDelegateActionSignatureOptions = ReactNativeBaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};
```

**Properties:**

- `delegateAction` - NEAR delegate action to sign
- `imageUrl` - URL of the dApp icon/logo
- `name` - Name of the dApp

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

### ReactNativeProviderError

Custom error class thrown by the provider.

```typescript
class ReactNativeProviderError extends Error {
    constructor(code: ReactNativeProviderErrorCodes)
}
```

### ReactNativeProviderErrorCodes

Error codes used by the provider.

```typescript
enum ReactNativeProviderErrorCodes {
    USER_NOT_LOGGED_IN = "USER_NOT_LOGGED_IN",
    CREDENTIALS_NOT_FOUND = "CREDENTIALS_NOT_FOUND",
    INVALID_TOKEN = "INVALID_TOKEN"
}
```

**Error Codes:**

- `USER_NOT_LOGGED_IN` - Thrown when attempting to access user data without being authenticated
- `CREDENTIALS_NOT_FOUND` - Thrown when credentials are not found in storage
- `INVALID_TOKEN` - Thrown when the token is invalid or malformed

#### Example

```javascript
import { 
    ReactNativeProviderError, 
    ReactNativeProviderErrorCodes 
} from '@fast-auth/react-native-provider';

try {
    const path = await provider.getPath();
} catch (error) {
    if (error instanceof ReactNativeProviderError) {
        switch (error.code) {
            case ReactNativeProviderErrorCodes.USER_NOT_LOGGED_IN:
                console.log('Please log in first');
                break;
            case ReactNativeProviderErrorCodes.CREDENTIALS_NOT_FOUND:
                console.log('Credentials not found');
                break;
            case ReactNativeProviderErrorCodes.INVALID_TOKEN:
                console.log('Invalid token');
                break;
        }
    }
}
```

## Re-exports

The package also re-exports the following from `react-native-auth0`:

- `Auth0Provider` - React component for Auth0 context
- `Auth0Options` - Type definitions for Auth0 options

These can be used directly if needed:

```javascript
import { Auth0Provider } from '@fast-auth/react-native-provider';
```
