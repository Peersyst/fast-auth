# Authenticate your Users

This section covers implementing user authentication in your application. For detailed API reference, see the [Browser SDK Client](../sdk/browser/client) or [React SDK Client](../sdk/react/client) documentation.

## Initialize the Client

First, create a FastAuth client with your provider and configuration:

```typescript
import { FastAuthClient } from "@fast-auth-near/browser-sdk";
import { JavascriptProvider } from "@fast-auth-near/javascript-provider";
import { connect } from "near-api-js";

// Initialize the provider with your Auth0 credentials
const provider = new JavascriptProvider({
  domain: "your-tenant.auth0.com",
  clientId: "your-client-id",
  audience: "https://your-api-audience.com",
  redirectUri: window.location.origin,
});

// Connect to NEAR
const connection = await connect({
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
});

// Create the FastAuth client
const client = new FastAuthClient(provider, connection.connection, {
  fastAuthContractId: "fast-auth.testnet",
  mpcContractId: "mpc.testnet",
});
```

For more details on client configuration options, see the [FastAuthClient API documentation](../sdk/browser/client).

## Login

Initiate the login flow. This redirects users to Auth0 for authentication:

```typescript
// Redirect to Auth0 login
await client.login();
```

After successful authentication, Auth0 redirects back to your application. Check if the user is logged in:

```typescript
// Check login status (call this on page load)
const isLoggedIn = await provider.isLoggedIn();

if (isLoggedIn) {
  console.log("User is authenticated!");
  // Proceed with your application logic
}
```

## Logout

Sign the user out and clear their session:

```typescript
await client.logout();
```

## React Example

Using the React SDK with hooks:

```tsx
import { FastAuthProvider, useFastAuth, useIsLoggedIn } from "@fast-auth-near/react-sdk";
import { JavascriptProvider } from "@fast-auth-near/javascript-provider";

// Wrap your app with the provider
function App() {
  const provider = new JavascriptProvider({
    domain: "your-tenant.auth0.com",
    clientId: "your-client-id",
    audience: "https://your-api-audience.com",
    redirectUri: window.location.origin,
  });

  return (
    <FastAuthProvider provider={provider} config={...}>
      <AuthenticatedApp />
    </FastAuthProvider>
  );
}

// Use hooks in your components
function AuthenticatedApp() {
  const { login, logout } = useFastAuth();
  const isLoggedIn = useIsLoggedIn();

  if (!isLoggedIn) {
    return <button onClick={login}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

For more information on React hooks, see the [React SDK Hooks](../sdk/react/hooks) documentation. For provider configuration, see the [JavaScript Provider API](../providers/javascript/api).
