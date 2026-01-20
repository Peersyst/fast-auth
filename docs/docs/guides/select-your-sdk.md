# Select your SDK

FastAuth provides two SDKs tailored for different frontend frameworks:

| SDK | Package | Use Case |
|-----|---------|----------|
| **[Browser SDK](../sdk/browser/getting-started)** | `@fast-auth/browser-sdk` | Vanilla JavaScript, Vue, Svelte, or any web framework |
| **[React SDK](../sdk/react/getting-started)** | `@fast-auth/react-sdk` | React applications with hooks and context providers |

## Browser SDK

The Browser SDK provides a framework-agnostic `FastAuthClient` class that works with any JavaScript application. Use this if:

- You're building with vanilla JavaScript, TypeScript, Vue, Svelte, or Angular.
- You need full control over the authentication flow.
- You prefer a class-based API.

```bash
npm install @fast-auth/browser-sdk
```

For detailed documentation, see the [Browser SDK Getting Started](../sdk/browser/getting-started) and [Browser SDK Client API](../sdk/browser/client).

## React SDK

The React SDK wraps the Browser SDK with React-specific features like hooks and context providers. Use this if:

- You're building a React application.
- You want to use hooks like `useFastAuth()`, `useIsLoggedIn()`, and `useSigner()`.
- You prefer declarative state management.

```bash
npm install @fast-auth/react-sdk
```

For detailed documentation, see the [React SDK Getting Started](../sdk/react/getting-started), [React SDK Client API](../sdk/react/client), and [React SDK Hooks](../sdk/react/hooks) for hooks usage.
