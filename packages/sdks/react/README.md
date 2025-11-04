# @fast-auth/react-sdk

React SDK for FastAuth - A provider-agnostic authentication solution for NEAR Protocol.

## Features

- 🔐 **Provider-agnostic**: Works with any auth provider implementing the `IFastAuthProvider` interface
- ⚛️ **React-first**: Built with React best practices (hooks, context, memoization)
- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🪝 **Multiple hooks**: Convenient hooks for common operations
- 📦 **Zero-config**: Sensible defaults with full customization options
- 🔄 **State management**: Built-in loading, error, and authentication state management

## Installation

```bash
npm install @fast-auth/react-sdk near-api-js
# or
pnpm add @fast-auth/react-sdk near-api-js
# or
yarn add @fast-auth/react-sdk near-api-js
```

## Compatible Providers

| Provider | Package | Platform | Status |
|----------|---------|----------|--------|
| React Native (Auth0) | `@fast-auth/react-native-provider` | React Native (iOS/Android) | ✅ Stable |

> **Note:** You can create custom providers by implementing the `IFastAuthProvider` interface.

## Usage

### Basic Setup with React Native Provider

```tsx
import { FastAuthProvider } from '@fast-auth/react-sdk';
import { reactNativeProviderConfig } from '@fast-auth/react-native-provider';
import { Connection } from 'near-api-js';

// Configure NEAR connection
const connection = new Connection({
  networkId: 'testnet',
  provider: { type: 'JsonRpcProvider', args: { url: 'https://rpc.testnet.near.org' } },
});

// Configure FastAuth network
const network = {
  mpcContractId: 'v1.signer-prod.testnet',
  fastAuthContractId: 'fastauth.testnet',
};

function App() {
  // Configure the ReactNative provider with Auth0 credentials
  const providerConfig = reactNativeProviderConfig({
    domain: 'your-domain.auth0.com',
    clientId: 'your-client-id',
    imageUrl: 'https://your-app.com/icon.png',
    name: 'Your App Name',
    audience: 'your-api-identifier', // optional
  });

  return (
    <FastAuthProvider
      providerConfig={providerConfig}
      connection={connection}
      network={network}
    >
      <YourApp />
    </FastAuthProvider>
  );
}
```

### With Custom Provider

If you want to create a custom provider, implement the `IFastAuthProvider` interface:

```tsx
import { FastAuthProvider } from '@fast-auth/react-sdk';
import { Connection } from 'near-api-js';
import { YourCustomProvider } from './your-custom-provider';

const connection = new Connection({
  networkId: 'testnet',
  provider: { type: 'JsonRpcProvider', args: { url: 'https://rpc.testnet.near.org' } },
});

const network = {
  mpcContractId: 'v1.signer-prod.testnet',
  fastAuthContractId: 'fastauth.testnet',
};

function App() {
  const providerConfig = {
    provider: new YourCustomProvider({
      // Your provider configuration
    }),
    // Optional: wrap with a React provider if needed
    reactProvider: (children) => (
      <YourAuthProvider>
        {children}
      </YourAuthProvider>
    ),
  };

  return (
    <FastAuthProvider
      providerConfig={providerConfig}
      connection={connection}
      network={network}
    >
      <YourApp />
    </FastAuthProvider>
  );
}
```

## Hooks

### useFastAuth

Main hook to access the FastAuth client and ready state.

```tsx
import { useFastAuth } from '@fast-auth/react-sdk';

function MyComponent() {
  const { client, isReady } = useFastAuth();

  if (!isReady || !client) {
    return <div>Initializing...</div>;
  }

  // Use client directly for all operations
  const handleLogin = async () => {
    await client.login();
  };

  const handleLogout = async () => {
    await client.logout();
  };

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

### useIsLoggedIn

Convenient hook to check login status with loading and error states.

```tsx
import { useIsLoggedIn } from '@fast-auth/react-sdk';

function LoginButton() {
  const { isLoggedIn, isLoading, error } = useIsLoggedIn();

  if (isLoading) {
    return <div>Checking status...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>{isLoggedIn ? 'Logged in' : 'Not logged in'}</div>;
}
```

### useSigner

Hook to get the FastAuth signer with automatic state management.

```tsx
import { useSigner } from '@fast-auth/react-sdk';

function SignerComponent() {
  const { signer, isLoading, error, refetch } = useSigner();

  if (isLoading) {
    return <div>Loading signer...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!signer) {
    return <div>Please log in</div>;
  }

  return <div>Signer ready!</div>;
}
```

### usePublicKey

Hook to get the user's public key.

```tsx
import { usePublicKey } from '@fast-auth/react-sdk';

function PublicKeyDisplay() {
  const { publicKey, isLoading, error } = usePublicKey('ed25519');

  if (isLoading) {
    return <div>Loading public key...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!publicKey) {
    return <div>Please log in</div>;
  }

  return <div>Public Key: {publicKey.toString()}</div>;
}
```

## Creating a Custom Provider

To create a custom auth provider, implement the `IFastAuthProvider` interface:

```typescript
import { IFastAuthProvider, SignatureRequest } from '@fast-auth/react-sdk';

export class MyCustomProvider implements IFastAuthProvider {
  async isLoggedIn(): Promise<boolean> {
    // Check if user is logged in
    return false;
  }

  async login(...args: any[]): Promise<void> {
    // Implement login logic
  }

  async logout(): Promise<void> {
    // Implement logout logic
  }

  async getPath(): Promise<string> {
    // Return the user's path (e.g., "jwt#https://domain.com/#user-id")
    return "";
  }

  async requestTransactionSignature(...args: any[]): Promise<void> {
    // Request transaction signature from user
  }

  async requestDelegateActionSignature(...args: any[]): Promise<void> {
    // Request delegate action signature from user
  }

  async getSignatureRequest(): Promise<SignatureRequest> {
    // Get the signature request after user approval
    return {
      guardId: "",
      verifyPayload: "",
      signPayload: new Uint8Array(),
      algorithm: "ecdsa",
    };
  }
}
```

## TypeScript

The SDK is fully typed. You can use generic types for better type inference:

```typescript
import { useFastAuth } from '@fast-auth/react-sdk';
import { MyCustomProvider } from './my-provider';

function MyComponent() {
  const { client } = useFastAuth<MyCustomProvider>();

  // TypeScript will infer the correct types
  const handleLogin = async () => {
    if (client) {
      await client.login(/* correctly typed parameters */);
    }
  };
}
```

## API Reference

### FastAuthProvider Props

| Prop              | Type                              | Required | Description                                      |
|-------------------|-----------------------------------|----------|--------------------------------------------------|
| `providerConfig`  | `FastAuthProviderConfig`          | Yes      | Provider configuration                           |
| `connection`      | `Connection`                      | Yes      | NEAR connection instance                         |
| `network`         | `FastAuthClientNetwork`           | Yes      | FastAuth network configuration                   |

### FastAuthProviderConfig

| Property         | Type                              | Required | Description                          |
|------------------|-----------------------------------|----------|--------------------------------------|
| `provider`       | `IFastAuthProvider`               | Yes      | Auth provider implementation         |
| `reactProvider`  | `(children: ReactNode) => ReactNode` | No   | Optional React provider wrapper      |

### FastAuthClientNetwork

| Property            | Type     | Required | Description                          |
|---------------------|----------|----------|--------------------------------------|
| `mpcContractId`     | `string` | Yes      | MPC contract account ID              |
| `fastAuthContractId`| `string` | Yes      | FastAuth contract account ID         |

### IFastAuthProvider Interface

Required methods for custom providers:

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `isLoggedIn` | - | `Promise<boolean>` | Check if user is logged in |
| `login` | `...args: any[]` | `Promise<void>` | Initiate login flow |
| `logout` | - | `Promise<void>` | Log out user |
| `getPath` | - | `Promise<string>` | Get user's path identifier |
| `requestTransactionSignature` | `...args: any[]` | `Promise<void>` | Request transaction signature |
| `requestDelegateActionSignature` | `...args: any[]` | `Promise<void>` | Request delegate action signature |
| `getSignatureRequest` | - | `Promise<SignatureRequest>` | Get signature request after approval |

### Hook Return Types

All hooks return objects with loading, error, and data states:

```typescript
// useIsLoggedIn
{ isLoggedIn: boolean | null; isLoading: boolean; error: Error | null }

// useSigner
{ signer: FastAuthSigner | null; isLoading: boolean; error: Error | null; refetch: () => void }

// usePublicKey
{ publicKey: PublicKey | null; isLoading: boolean; error: Error | null }

// useFastAuth
{ client: FastAuthClient | null; isReady: boolean }
```

## Examples

See the `examples/` directory for complete examples using different providers.

## Related Packages

- [`@fast-auth/react-native-provider`](../../providers/react-native/README.md) - React Native provider for Auth0

## License

MIT

