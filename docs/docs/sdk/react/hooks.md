# Hooks

The FastAuth React SDK provides several React hooks that simplify authentication and transaction operations. These hooks manage loading states, errors, and provide convenient access to the FastAuth client and signer.

## Overview

All hooks must be used within a `FastAuthProvider` component. They automatically handle state management, error handling, and provide reactive updates when the authentication state changes.

## useFastAuth

The main hook to access the FastAuth client and ready state.

### Signature

```typescript
function useFastAuth<P extends IFastAuthProvider = IFastAuthProvider>(): IFastAuthContext<P>
```

### Returns

```typescript
interface IFastAuthContext<P extends IFastAuthProvider = IFastAuthProvider> {
    client: FastAuthClient<P> | null;
    isReady: boolean;
}
```

- **`client`**: The FastAuth client instance. Null until initialized.
- **`isReady`**: Whether the client is ready to use.

### Usage

```tsx
import { useFastAuth } from "@fast-auth/react-sdk";

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

### Error Handling

```tsx
function MyComponent() {
    const { client, isReady } = useFastAuth();

    if (!isReady || !client) {
        return <div>Initializing...</div>;
    }

    const handleLogin = async () => {
        try {
            await client.login();
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    return <button onClick={handleLogin}>Login</button>;
}
```

## useIsLoggedIn

Convenient hook to check login status with loading and error states.

### Signature

```typescript
function useIsLoggedIn<P extends IFastAuthProvider = IFastAuthProvider>(
    autoCheck?: boolean
): {
    isLoggedIn: boolean | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}
```

### Parameters

- **`autoCheck`**: Whether to automatically check login status when client is ready (default: `true`)

### Returns

- **`isLoggedIn`**: Current login status (`true`, `false`, or `null` if not checked yet)
- **`isLoading`**: Whether the login check is in progress
- **`error`**: Error object if the check failed
- **`refetch`**: Function to manually trigger a login status check

### Usage

```tsx
import { useIsLoggedIn } from "@fast-auth/react-sdk";

function LoginButton() {
    const { isLoggedIn, isLoading, error, refetch } = useIsLoggedIn();

    if (isLoading) {
        return <div>Checking status...</div>;
    }

    if (error) {
        return (
            <div>
                <div>Error: {error.message}</div>
                <button onClick={refetch}>Retry</button>
            </div>
        );
    }

    return <div>{isLoggedIn ? "Logged in" : "Not logged in"}</div>;
}
```

## useSigner

Hook to get the FastAuth signer with automatic state management.

### Signature

```typescript
function useSigner<P extends IFastAuthProvider = IFastAuthProvider>(
    autoFetch?: boolean
): {
    signer: FastAuthSigner<P> | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}
```

### Parameters

- **`autoFetch`**: Whether to automatically fetch the signer when client is ready (default: `true`)

### Returns

- **`signer`**: The FastAuth signer instance. Null if not authenticated or not fetched yet.
- **`isLoading`**: Whether the signer is being fetched
- **`error`**: Error object if fetching failed
- **`refetch`**: Function to manually trigger a signer fetch

## usePublicKey

Hook to get the user's public key with automatic state management.

### Signature

```typescript
function usePublicKey<P extends IFastAuthProvider = IFastAuthProvider>(
    algorithm?: Algorithm,
    autoFetch?: boolean
): {
    publicKey: PublicKey | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}
```

### Parameters

- **`algorithm`**: The algorithm to use for the public key (default: `"ed25519"`)
- **`autoFetch`**: Whether to automatically fetch the public key when signer is available (default: `true`)

### Returns

- **`publicKey`**: The user's public key. Null if not authenticated or not fetched yet.
- **`isLoading`**: Whether the public key is being fetched
- **`error`**: Error object if fetching failed
- **`refetch`**: Function to manually trigger a public key fetch

### Usage

```tsx
import { usePublicKey } from "@fast-auth/react-sdk";

function PublicKeyDisplay() {
    const { publicKey, isLoading, error } = usePublicKey("ed25519");

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

### Multiple Algorithms

```tsx
function PublicKeysDisplay() {
    const ed25519Key = usePublicKey("ed25519");
    const secp256k1Key = usePublicKey("secp256k1");

    return (
        <div>
            {ed25519Key.publicKey && (
                <div>ED25519: {ed25519Key.publicKey.toString()}</div>
            )}
            {secp256k1Key.publicKey && (
                <div>SECP256K1: {secp256k1Key.publicKey.toString()}</div>
            )}
        </div>
    );
}
```

## TypeScript Support

All hooks support TypeScript generics for better type inference:

```tsx
import { useFastAuth } from "@fast-auth/react-sdk";
import { MyCustomProvider } from "./my-provider";

function MyComponent() {
    const { client } = useFastAuth<MyCustomProvider>();

    // TypeScript will infer the correct parameter types for login
    const handleLogin = () => {
        client?.login(/* correctly typed parameters */);
    };

    return <button onClick={handleLogin}>Login</button>;
}
```