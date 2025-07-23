# Auth0

FastAuth leverages [Auth0](https://auth0.com/) as its **primary authentication provider**, enabling a seamless and secure social login experience for users. Auth0 provides a robust identity platform that handles user authentication across multiple providers while maintaining high security standards.

:::info

This authentication method is the default and is used for all transactions and delegated actions by the user. We recommend using this method for the best user experience.

:::

## Supported Login Providers

FastAuth supports several login methods through Auth0:

- **Google**: Users can sign in using their Google accounts, providing a familiar and convenient authentication method. This integration allows users to leverage their existing Google credentials without creating new accounts.

- **Apple**: Apple Sign-In support ensures iOS users can authenticate securely using their Apple ID. This method provides enhanced privacy features and follows Apple's authentication guidelines.

- **Auth0 Username/Password**: Auth0's native username and password authentication system provides a traditional login option for users who prefer to create dedicated accounts.

- **Passkeys**: Support for passkeys offers a modern, passwordless authentication method that enhances security while simplifying the login experience. Passkeys use public key cryptography to authenticate users across their devices.

## Transaction Authentication

For enhanced security, FastAuth requires authentication through Auth0 for every transaction or delegated action by the user. This ensures that all sensitive operations are properly authorized and authenticated, maintaining a secure environment for users' assets and actions.

Transactions and delegated actions are included in the JWT payload returned by Auth0, which is then verified against the [Auth0Guard](./architecture_contracts_auth0-guard.md) contract, verifying the user's identity and ensuring the transaction is authorized.
