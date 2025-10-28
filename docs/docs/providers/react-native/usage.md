# Usage

Learn how to use the FastAuth JavaScript Provider in your application.

## Basic Setup

First, import and initialize the FastAuth Provider:

```javascript
import { FastAuthProvider } from '@peersyst/fast-auth-provider-javascript';

const provider = new FastAuthProvider({
    network: 'testnet',
    authServiceUrl: 'your-auth-service-url',
});
```

## Authentication Flow

### Sign In

To authenticate a user:

```javascript
try {
    const session = await provider.signIn({
        email: 'user@example.com',
    });
    
    console.log('User authenticated:', session);
} catch (error) {
    console.error('Authentication failed:', error);
}
```

### Get Current Session

To retrieve the current user session:

```javascript
const session = await provider.getSession();

if (session) {
    console.log('User is authenticated:', session.user);
} else {
    console.log('No active session');
}
```

### Sign Out

To sign out the current user:

```javascript
await provider.signOut();
console.log('User signed out');
```

## Configuration Options

The JavaScript Provider accepts the following configuration options:

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `network` | `'testnet' \| 'mainnet'` | NEAR network to connect to | Yes |
| `authServiceUrl` | `string` | URL of your FastAuth service | Yes |
| `storage` | `Storage` | Custom storage implementation | No |

## Example

Here's a complete example of integrating the JavaScript Provider:

```javascript
import { FastAuthProvider } from '@peersyst/fast-auth-provider-javascript';

// Initialize the provider
const provider = new FastAuthProvider({
    network: 'testnet',
    authServiceUrl: 'https://your-auth-service.com',
});

// Sign in
async function signIn(email) {
    try {
        const session = await provider.signIn({ email });
        console.log('Signed in:', session.user);
        return session;
    } catch (error) {
        console.error('Sign in failed:', error);
        throw error;
    }
}

// Check authentication status
async function checkAuth() {
    const session = await provider.getSession();
    return session !== null;
}

// Sign out
async function signOut() {
    await provider.signOut();
    console.log('Signed out successfully');
}
```

## Next Steps

- [API Reference](./api) - Explore the complete API documentation

