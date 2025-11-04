# @fast-auth/react-native-provider

React Native provider for FastAuth - Adapts react-native-auth0 to the FastAuth provider interface.

## Overview

This package provides a React Native implementation of the FastAuth provider interface using [react-native-auth0](https://github.com/auth0/react-native-auth0). It allows React Native applications to use FastAuth for NEAR Protocol authentication and transaction signing.

## Features

- 🔐 **Auth0 Integration**: Built on top of react-native-auth0
- 📱 **React Native First**: Designed specifically for React Native applications
- 🎯 **Type-safe**: Full TypeScript support
- 🔄 **Automatic Credential Management**: Handles token storage and refresh automatically
- 🌐 **Universal Login**: Uses Auth0's Universal Login in the system browser
- 📦 **Zero-config**: Works out of the box with sensible defaults

## Installation

```bash
npm install @fast-auth/react-native react-native-auth0 near-api-js
# or
pnpm add @fast-auth/react-native react-native-auth0 near-api-js
# or
yarn add @fast-auth/react-native react-native-auth0 near-api-js
```

### Additional Setup

Since this package uses `react-native-auth0`, you need to configure your React Native project according to the [react-native-auth0 documentation](https://github.com/auth0/react-native-auth0#getting-started).

## Usage

### Basic Setup with FastAuth React SDK

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

export default App;
```

### Using the Provider Directly

You can also use the `ReactNativeProvider` directly without the React SDK:

```typescript
import { ReactNativeProvider } from '@fast-auth/react-native';

const provider = new ReactNativeProvider({
  domain: 'your-domain.auth0.com',
  clientId: 'your-client-id',
  audience: 'your-api-identifier',
});

// Check if user is logged in
const isLoggedIn = await provider.isLoggedIn();

// Login
await provider.login();

// Get user path
const path = await provider.getPath();

// Logout
await provider.logout();
```

### With FastAuth React Hooks

```tsx
import { useFastAuth } from '@fast-auth/react';
import { View, Button, Text } from 'react-native';

function LoginScreen() {
  const { login, logout, isLoggedIn, isLoading } = useFastAuth();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View>
      {isLoggedIn ? (
        <Button title="Logout" onPress={logout} />
      ) : (
        <Button title="Login" onPress={() => login()} />
      )}
    </View>
  );
}
```

## API Reference

### ReactNativeProvider

#### Constructor Options

```typescript
type ReactNativeProviderOptions = {
  domain: string;        // Your Auth0 domain (e.g., 'your-tenant.auth0.com')
  clientId: string;      // Your Auth0 client ID
  imageUrl: string;      // URL of the app image to display in authorization UI
  name: string;          // Name of your application
  audience?: string;     // Optional: Your API identifier in Auth0
  timeout?: number;      // Optional: Request timeout in milliseconds
  headers?: Record<string, string>; // Optional: Additional headers
};
```

## Error Handling

The provider throws `ReactNativeProviderError` with the following error codes:

- `USER_NOT_LOGGED_IN`: User is not authenticated
- `CREDENTIALS_NOT_FOUND`: No valid credentials found
- `INVALID_TOKEN`: The JWT token is invalid or missing required claims

```typescript
import { ReactNativeProviderError, ReactNativeProviderErrorCodes } from '@fast-auth/react-native';

try {
  const path = await provider.getPath();
} catch (error) {
  if (error instanceof ReactNativeProviderError) {
    if (error.message === ReactNativeProviderErrorCodes.USER_NOT_LOGGED_IN) {
      // Handle not logged in case
    }
  }
}
```

## Auth0 Configuration

### Required Auth0 Settings

1. **Allowed Callback URLs**: Add your app's callback URL
   ```
   yourapp://your-domain.auth0.com/ios/yourapp/callback
   yourapp://your-domain.auth0.com/android/yourapp/callback
   ```

2. **Allowed Logout URLs**: Add your app's logout URL
   ```
   yourapp://your-domain.auth0.com/ios/yourapp
   yourapp://your-domain.auth0.com/android/yourapp
   ```

3. **Grant Types**: Enable the following grant types:
   - Authorization Code
   - Refresh Token

4. **API Configuration** (if using audience):
   - Create an API in Auth0
   - Use the API identifier as the `audience` parameter

### iOS Specific Configuration

Add the following to your `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>None</string>
    <key>CFBundleURLName</key>
    <string>auth0</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>yourapp</string>
    </array>
  </dict>
</array>
```

### Android Specific Configuration

Update `android/app/src/main/AndroidManifest.xml`:

```xml
<activity
  android:name="com.auth0.android.provider.WebAuthActivity"
  android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
      android:host="your-domain.auth0.com"
      android:pathPrefix="/android/${applicationId}/callback"
      android:scheme="${applicationId}" />
  </intent-filter>
</activity>
```

## Platform Support

- ✅ iOS
- ✅ Android
- ⚠️ Web (uses react-native-auth0's web implementation)

## License

MIT

## Related Packages

- [@fast-auth/react-sdk](../../sdks/react/README.md) - React SDK for FastAuth
- [react-native-auth0](https://github.com/auth0/react-native-auth0) - Auth0 SDK for React Native

