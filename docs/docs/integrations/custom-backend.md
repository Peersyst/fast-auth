# Custom Backend Integration

Build your own authentication backend with full control over the JWT signing and validation process. This integration gives you the flexibility to implement custom authentication logic while still benefiting from FastAuth's transaction signing capabilities.

## Overview

A custom backend integration allows you to:

- **Full Control**: Implement your own authentication and authorization logic
- **Custom JWT Signing**: Generate JWT tokens with your own signing keys
- **Flexibility**: Choose your preferred backend framework and architecture
- **Security**: Maintain complete control over your authentication flow

## How It Works

1. **Generate JWT Tokens**: Your backend generates JWT tokens containing the transaction payload
2. **Sign Transactions**: The JWT includes a `fatxn` claim with the hex-encoded transaction data
3. **Verify Tokens**: FastAuth contracts verify the JWT signatures using your public key
4. **Sign Transactions**: Users sign transactions through the FastAuth MPC service

## Implementation Steps

1. **Generate RSA Key Pair**: Create a public/private key pair for JWT signing
2. **Set Up Backend**: Create your backend server with JWT generation endpoint
3. **Implement Authentication**: Add your authentication logic
4. **Deploy Guard Contract**: Deploy a JWT guard contract with your public key
5. **Register Guard**: Register your guard in the JwtGuardRouter contract
6. **Test Integration**: Verify the complete authentication and signing flow

## Example Implementation

For a complete example implementation using Express.js, see the [Express Backend Guide](./custom-backend-express). It provides step-by-step instructions for:

- Setting up an Express.js server
- Generating JWT tokens with transaction payloads
- Configuring the JWT guard contract
- Testing the integration

## Next Steps

1. Review the [Express Backend example](./custom-backend-express) for implementation details
2. Check out the [JWT RS256 Guard integration](./jwt-rs256-guard) for contract setup
3. Explore the [examples repository](https://github.com/Peersyst/fast-auth/tree/main/examples/custom-backend) for complete code

## Related Documentation

- [Architecture: Custom Backend](../concepts/architecture_custom_backend) - Learn about the custom backend architecture
- [JWT RS256 Guard](./jwt-rs256-guard) - Set up your JWT guard contract
- [Auth0 Integration](./auth0) - Alternative integration using Auth0
