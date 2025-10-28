# Usage

Learn how to use the FastAuth JavaScript Provider in your application.

## Basic Setup

First, import and initialize the JavaScript Provider with your Auth0 configuration:

```javascript
import { JavascriptProvider } from '@fast-auth/javascript-provider';

const provider = new JavascriptProvider({
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    redirectUri: window.location.origin,
    audience: 'your-auth0-audience',
});
```

## Authentication Flow

### Login

To authenticate a user, redirect them to the Auth0 login page:

```javascript
async function login() {
    await provider.login();
    // User will be redirected to Auth0 login page
}
```

### Check Authentication Status

After the redirect callback, check if the user is logged in:

```javascript
async function checkAuth() {
    const isLoggedIn = await provider.isLoggedIn();
    
    if (isLoggedIn) {
        console.log('User is authenticated');
        const path = await provider.getPath();
        console.log('User path:', path);
    } else {
        console.log('User is not authenticated');
    }
}
```

### Logout

To sign out the current user:

```javascript
async function logout() {
    await provider.logout();
    console.log('User logged out');
}
```

## Transaction Signing

### Sign a Transaction

Request a signature for a NEAR transaction:

```javascript
import { Transaction } from 'near-api-js/lib/transaction';

async function signTransaction(transaction) {
    await provider.requestTransactionSignature({
        transaction: transaction,
        imageUrl: 'https://example.com/icon.png',
        name: 'My dApp',
        redirectUri: window.location.origin + '/callback', // Optional
    });
    // User will be redirected to approve the transaction
}
```

### Sign a Delegate Action

Request a signature for a delegate action:

```javascript
import { DelegateAction } from '@near-js/transactions';

async function signDelegateAction(delegateAction) {
    await provider.requestDelegateActionSignature({
        delegateAction: delegateAction,
        imageUrl: 'https://example.com/icon.png',
        name: 'My dApp',
        redirectUri: window.location.origin + '/callback', // Optional
    });
    // User will be redirected to approve the delegate action
}
```

### Get Signature Request

After the redirect callback, retrieve the signature request:

```javascript
async function getSignature() {
    try {
        const signatureRequest = await provider.getSignatureRequest();
        console.log('Guard ID:', signatureRequest.guardId);
        console.log('Verify Payload:', signatureRequest.verifyPayload);
        console.log('Sign Payload:', signatureRequest.signPayload);
        return signatureRequest;
    } catch (error) {
        console.error('Failed to get signature:', error);
    }
}
```

## Configuration Options

The JavaScript Provider accepts the following configuration options:

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `domain` | `string` | Your Auth0 domain (e.g., 'your-app.auth0.com') | Yes |
| `clientId` | `string` | Your Auth0 application client ID | Yes |
| `redirectUri` | `string` | URL to redirect after authentication | Yes |
| `audience` | `string` | Auth0 API audience identifier | Yes |

## Complete Example

Here's a complete example of integrating the JavaScript Provider in a web application:

```javascript
import { JavascriptProvider } from '@fast-auth/javascript-provider';
import { Transaction } from 'near-api-js/lib/transaction';

// Initialize the provider
const provider = new JavascriptProvider({
    domain: 'your-auth0-domain.auth0.com',
    clientId: 'your-auth0-client-id',
    redirectUri: window.location.origin,
    audience: 'your-auth0-audience',
});

// Handle authentication on page load
async function handleAuthCallback() {
    const isLoggedIn = await provider.isLoggedIn();
    
    if (isLoggedIn) {
        const path = await provider.getPath();
        console.log('User authenticated with path:', path);
        return true;
    }
    return false;
}

// Login handler
async function handleLogin() {
    try {
        await provider.login();
    } catch (error) {
        console.error('Login failed:', error);
    }
}

// Logout handler
async function handleLogout() {
    try {
        await provider.logout();
        console.log('Logged out successfully');
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Transaction signing handler
async function handleSignTransaction(transaction) {
    try {
        await provider.requestTransactionSignature({
            transaction,
            imageUrl: 'https://example.com/logo.png',
            name: 'My NEAR dApp',
        });
    } catch (error) {
        console.error('Transaction signing failed:', error);
    }
}

// Initialize app
handleAuthCallback();
```

## Error Handling

The provider throws `JavascriptProviderError` when errors occur:

```javascript
import { JavascriptProviderError } from '@fast-auth/javascript-provider';

try {
    const path = await provider.getPath();
} catch (error) {
    if (error instanceof JavascriptProviderError) {
        console.error('Provider error:', error.message);
        // Handle USER_NOT_LOGGED_IN error
    }
}
```

## Next Steps

- [API Reference](./api) - Explore the complete API documentation

