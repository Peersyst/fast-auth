# @fast-auth/react

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
npm install @fast-auth/react near-api-js
# or
pnpm add @fast-auth/react near-api-js
# or
yarn add @fast-auth/react near-api-js
```

## Usage

### Basic Setup

```tsx
import { FastAuthProvider } from '@fast-auth/react';
import { Connection } from 'near-api-js';
import { YourAuthProvider } from '@your-auth/provider';

const connection = new Connection({
  networkId: 'testnet',
  provider: { type: 'JsonRpcProvider', args: { url: 'https://rpc.testnet.near.org' } },
});

const clientOptions = {
  mpcContractId: 'v1.signer-prod.testnet',
  fastAuthContractId: 'fastauth.testnet',
};

function App() {
  const providerConfig = {
    provider: new YourAuthProvider({
      // Your provider configuration
    }),
  };

  return (
    <FastAuthProvider
      providerConfig={providerConfig}
      connection={connection}
      clientOptions={clientOptions}
    >
      <YourApp />
    </FastAuthProvider>
  );
}
```

### With React Provider Wrapper

If your auth provider has its own React provider (like `react-native-auth0`), you can wrap it:

```tsx
import { Auth0Provider } from 'react-native-auth0';

const providerConfig = {
  provider: new YourAuthProvider({
    // Your provider configuration
  }),
  reactProvider: (children) => (
    <Auth0Provider domain="your-domain.auth0.com" clientId="your-client-id">
      {children}
    </Auth0Provider>
  ),
};

function App() {
  return (
    <FastAuthProvider
      providerConfig={providerConfig}
      connection={connection}
      clientOptions={clientOptions}
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
import { useFastAuth } from '@fast-auth/react';

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
import { useIsLoggedIn } from '@fast-auth/react';

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
import { useSigner } from '@fast-auth/react';

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
import { usePublicKey } from '@fast-auth/react';

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
import { IFastAuthProvider } from '@fast-auth/react';

export class MyCustomProvider implements IFastAuthProvider {
  async isLoggedIn(): Promise<boolean> {
    // Check if user is logged in
  }

  async login(...args: any[]): Promise<void> {
    // Implement login logic
  }

  async logout(): Promise<void> {
    // Implement logout logic
  }

  async getPath(): Promise<string> {
    // Return the user's path
  }

  async requestTransactionSignature(...args: any[]): Promise<void> {
    // Request transaction signature
  }

  async requestDelegateActionSignature(...args: any[]): Promise<void> {
    // Request delegate action signature
  }

  async getSignatureRequest(): Promise<SignatureRequest> {
    // Get signature request
  }
}
```

## TypeScript

The SDK is fully typed. You can use generic types for better type inference:

```typescript
import { useFastAuth } from '@fast-auth/react';
import { MyCustomProvider } from './my-provider';

function MyComponent() {
  const { login } = useFastAuth<MyCustomProvider>();

  // TypeScript will infer the correct parameter types for login
  const handleLogin = () => {
    login(/* correctly typed parameters */);
  };
}
```

## API Reference

### FastAuthProvider Props

| Prop              | Type                              | Required | Description                                      |
|-------------------|-----------------------------------|----------|--------------------------------------------------|
| `providerConfig`  | `FastAuthProviderConfig`          | Yes      | Provider configuration                           |
| `connection`      | `Connection`                      | Yes      | NEAR connection instance                         |
| `clientOptions`   | `FastAuthClientOptions`           | Yes      | FastAuth client options                          |

### FastAuthProviderConfig

| Property         | Type                              | Required | Description                          |
|------------------|-----------------------------------|----------|--------------------------------------|
| `provider`       | `IFastAuthProvider`               | Yes      | Auth provider implementation         |
| `reactProvider`  | `(children: ReactNode) => ReactNode` | No   | Optional React provider wrapper      |

### IFastAuthContext

See the type definitions in the source code for a complete list of available methods and properties.

## Examples

See the `examples/` directory for complete examples using different providers.

## License

MIT

