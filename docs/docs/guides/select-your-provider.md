# Select your Provider

**Providers** are platform-specific adapters that handle the authentication flow with your identity provider (e.g., Auth0). They abstract away the differences between web browsers and mobile platforms.

| Provider | Package | Platform |
|----------|---------|----------|
| **[JavaScript Provider](../providers/javascript/getting-started)** | `@fast-auth-near/javascript-provider` | Web browsers |
| **[React Native Provider](../providers/react-native/getting-started)** | `@fast-auth-near/react-native-provider` | iOS and Android apps |

## How SDKs and Providers work together

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your dApp     │────▶│   FastAuth SDK  │────▶│    Provider     │
│                 │     │ (Client/Signer) │     │ (Auth0 adapter) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Identity       │
                                               │  Provider       │
                                               │  (Auth0)        │
                                               └─────────────────┘
```

- **SDKs** provide the `FastAuthClient` and `FastAuthSigner` classes for authentication and signing.
- **Providers** handle platform-specific authentication (browser redirects vs. native app flows).

## JavaScript Provider

The JavaScript Provider is designed for web browsers and works with the Browser SDK or React SDK. It handles OAuth redirects and token management.

For detailed documentation, see the [JavaScript Provider Getting Started](../providers/javascript/getting-started) and [JavaScript Provider API](../providers/javascript/api).

## React Native Provider

The React Native Provider is designed for iOS and Android mobile applications. It uses native authentication flows and secure credential storage.

For detailed documentation, see the [React Native Provider Getting Started](../providers/react-native/getting-started) and [React Native Provider API](../providers/react-native/api).

## Installation

For web applications:

```bash
npm install @fast-auth-near/browser-sdk @fast-auth-near/javascript-provider
```

For React web applications:

```bash
npm install @fast-auth-near/react-sdk @fast-auth-near/javascript-provider
```

For React Native applications:

```bash
npm install @fast-auth-near/react-sdk @fast-auth-near/react-native-provider
```
