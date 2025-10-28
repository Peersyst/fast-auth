# Installation

Learn how to install the FastAuth JavaScript Provider in your project.

## Prerequisites

- Node.js 16 or higher
- npm, yarn, or pnpm package manager
- A browser environment (this provider is designed for web applications)
- An Auth0 account with an application configured

## Installation

Install the JavaScript Provider using your preferred package manager:

```bash
npm install @fast-auth/javascript-provider
```

Or with yarn:

```bash
yarn add @fast-auth/javascript-provider
```

Or with pnpm:

```bash
pnpm add @fast-auth/javascript-provider
```

## Dependencies

The JavaScript Provider includes the following key dependencies:

- `@auth0/auth0-spa-js` - Auth0 authentication
- `near-api-js` - NEAR Protocol integration
- `@near-js/transactions` - NEAR transaction handling
- `jose` - JWT handling

These will be automatically installed with the provider.

## Verify Installation

After installation, you can verify that the package is installed correctly by importing it in your project:

```javascript
import { JavascriptProvider } from '@fast-auth/javascript-provider';

console.log('FastAuth JavaScript Provider installed successfully!');
```

## Next Steps

- [Usage](./usage) - Learn how to use the provider
- [API Reference](./api) - Explore the API documentation

