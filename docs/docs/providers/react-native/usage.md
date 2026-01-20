# Usage

Learn how to use the FastAuth React Native Provider in your application.

## Overview

The React Native Provider is designed to be used with the FastAuth React SDK. It implements the `IFastAuthProvider` interface and must be injected into a `FastAuthClient` from the React SDK. The provider handles Auth0 authentication and transaction signing for React Native applications, while the SDK handles NEAR blockchain interactions.

## SDK Compatibility

The React Native Provider is compatible with the following FastAuth SDK:

| SDK | Package | Compatibility | Notes |
|-----|---------|--------------|-------|
| React SDK | `@fast-auth/react-sdk` | ✅ Fully Compatible | Designed for React Native applications |

## Basic Setup

First, install both the React Native Provider and the React SDK:

```bash
# Install the React Native Provider
npm install @fast-auth/react-native-provider

# Install the React SDK
npm install @fast-auth/react-sdk near-api-js
```

Then, import and initialize the React Native Provider with your Auth0 configuration:

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

## Integration with React SDK

### Setup

The React Native Provider includes a helper function `reactNativeProviderConfig` that automatically configures the provider with the required `Auth0Provider` wrapper:

```javascript
import { FastAuthProvider } from '@fast-auth/react-sdk';
import { reactNativeProviderConfig } from '@fast-auth/react-native-provider';
import { Connection } from 'near-api-js';

const connection = new Connection({
    networkId: 'testnet',
    provider: { type: 'JsonRpcProvider', args: { url: 'https://rpc.testnet.near.org' } },
});

function App() {
    const providerConfig = reactNativeProviderConfig({
        domain: 'your-auth0-domain.auth0.com',
        clientId: 'your-auth0-client-id',
        audience: 'your-auth0-audience', // Optional
        imageUrl: 'https://example.com/icon.png',
        name: 'My dApp',
    });

    return (
        <FastAuthProvider
            providerConfig={providerConfig}
            connection={connection}
            network="testnet"
        >
            <YourApp />
        </FastAuthProvider>
    );
}
```

### Authentication

Use the React hooks to access authentication functionality:

```javascript
import { useFastAuth, useIsLoggedIn } from '@fast-auth/react-sdk';

function LoginComponent() {
    const { client, isReady } = useFastAuth();
    const { isLoggedIn } = useIsLoggedIn();

    const handleLogin = async () => {
        if (client) {
            await client.login();
            // User will be redirected to Auth0 login via system browser
            // Credentials are automatically saved after successful authentication
        }
    };

    const handleLogout = async () => {
        if (client) {
            await client.logout();
        }
    };

    if (!isReady) {
        return <Text>Initializing...</Text>;
    }

    return (
        <View>
            {isLoggedIn ? (
                <Button title="Logout" onPress={handleLogout} />
            ) : (
                <Button title="Login" onPress={handleLogin} />
            )}
        </View>
    );
}
```

### Transaction Signing

Use the signer hook to request transaction signatures:

```javascript
import { useSigner } from '@fast-auth/react-sdk';
import { Transaction } from 'near-api-js/lib/transaction';

function TransactionSigner() {
    const { signer, isLoading } = useSigner();

    const handleSignTransaction = async (transaction) => {
        if (signer) {
            try {
                await signer.requestTransactionSignature({
                    transaction,
                    imageUrl: 'https://example.com/icon.png',
                    name: 'My dApp',
                });
                // User will be redirected to approve the transaction
                // Credentials are automatically saved after approval
            } catch (error) {
                console.error('Transaction signing failed:', error);
            }
        }
    };

    if (isLoading) {
        return <Text>Loading signer...</Text>;
    }

    return (
        <Button
            title="Sign Transaction"
            onPress={() => handleSignTransaction(myTransaction)}
        />
    );
}
```

### Delegate Action Signing

```javascript
import { useSigner } from '@fast-auth/react-sdk';
import { DelegateAction } from '@near-js/transactions';

function DelegateActionSigner() {
    const { signer } = useSigner();

    const handleSignDelegateAction = async (delegateAction) => {
        if (signer) {
            try {
                await signer.requestDelegateActionSignature({
                    delegateAction,
                    imageUrl: 'https://example.com/icon.png',
                    name: 'My dApp',
                });
                // User will be redirected to approve the delegate action
                // Credentials are automatically saved after approval
            } catch (error) {
                console.error('Delegate action signing failed:', error);
            }
        }
    };

    return (
        <Button
            title="Sign Delegate Action"
            onPress={() => handleSignDelegateAction(myDelegateAction)}
        />
    );
}
```

### Getting Signature Request

After authentication, retrieve the signature request:

```javascript
import { useSigner } from '@fast-auth/react-sdk';

function SignatureComponent() {
    const { signer } = useSigner();

    const getSignature = async () => {
        if (signer) {
            try {
                const signatureRequest = await signer.getSignatureRequest();
                console.log('Guard ID:', signatureRequest.guardId);
                console.log('Verify Payload:', signatureRequest.verifyPayload);
                console.log('Sign Payload:', signatureRequest.signPayload);
                return signatureRequest;
            } catch (error) {
                console.error('Failed to get signature:', error);
            }
        }
    };

    return (
        <Button title="Get Signature" onPress={getSignature} />
    );
}
```

## Configuration Options

The React Native Provider accepts the following configuration options:

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `domain` | `string` | Your Auth0 domain (e.g., 'your-app.auth0.com') | Yes |
| `clientId` | `string` | Your Auth0 application client ID | Yes |
| `audience` | `string` | Auth0 API audience identifier | No |
| `imageUrl` | `string` | URL of the dApp icon/logo | Yes |
| `name` | `string` | Name of the dApp | Yes |

Additional Auth0 options from `react-native-auth0` can also be provided.

## Helper Function

### reactNativeProviderConfig

The `reactNativeProviderConfig` helper function automatically configures the provider with the required `Auth0Provider` wrapper from `react-native-auth0`:

```javascript
import { reactNativeProviderConfig } from '@fast-auth/react-native-provider';

const providerConfig = reactNativeProviderConfig({
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    audience: 'your-auth0-audience',
    imageUrl: 'https://example.com/icon.png',
    name: 'My dApp',
});

// providerConfig contains:
// - provider: ReactNativeProvider instance
// - reactProvider: Auth0Provider wrapper function
```

This helper ensures that the `Auth0Provider` from `react-native-auth0` is properly wrapped around your application components.
