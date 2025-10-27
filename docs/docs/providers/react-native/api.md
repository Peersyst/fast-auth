# API Reference

Complete API reference for the FastAuth JavaScript Provider.

## FastAuthProvider

The main class for interacting with the FastAuth service.

### Constructor

```typescript
new FastAuthProvider(config: FastAuthProviderConfig)
```

#### Parameters

- `config` - Configuration object for the provider

#### Example

```javascript
const provider = new FastAuthProvider({
    network: 'testnet',
    authServiceUrl: 'https://your-auth-service.com',
});
```

## Methods

### signIn

Authenticates a user and creates a new session.

```typescript
signIn(options: SignInOptions): Promise<Session>
```

#### Parameters

- `options.email` - User's email address
- `options.redirectUrl` (optional) - URL to redirect after authentication

#### Returns

Promise that resolves to a `Session` object.

#### Example

```javascript
const session = await provider.signIn({
    email: 'user@example.com',
});
```

---

### signOut

Signs out the current user and clears the session.

```typescript
signOut(): Promise<void>
```

#### Example

```javascript
await provider.signOut();
```

---

### getSession

Retrieves the current user session.

```typescript
getSession(): Promise<Session | null>
```

#### Returns

Promise that resolves to a `Session` object if authenticated, or `null` if not authenticated.

#### Example

```javascript
const session = await provider.getSession();
if (session) {
    console.log('User:', session.user);
}
```

---

### getAccountId

Gets the NEAR account ID for the current session.

```typescript
getAccountId(): Promise<string | null>
```

#### Returns

Promise that resolves to the account ID string, or `null` if not authenticated.

#### Example

```javascript
const accountId = await provider.getAccountId();
```

## Types

### FastAuthProviderConfig

Configuration options for the provider.

```typescript
interface FastAuthProviderConfig {
    network: 'testnet' | 'mainnet';
    authServiceUrl: string;
    storage?: Storage;
}
```

### Session

Represents an authenticated user session.

```typescript
interface Session {
    user: User;
    accountId: string;
    accessToken: string;
}
```

### User

User information.

```typescript
interface User {
    email: string;
    name?: string;
    picture?: string;
}
```

### SignInOptions

Options for the sign-in method.

```typescript
interface SignInOptions {
    email: string;
    redirectUrl?: string;
}
```

## Events

The provider emits the following events:

### sessionChanged

Fired when the user session changes (sign in, sign out, or session refresh).

```javascript
provider.on('sessionChanged', (session) => {
    console.log('Session changed:', session);
});
```

### error

Fired when an error occurs.

```javascript
provider.on('error', (error) => {
    console.error('Provider error:', error);
});
```

