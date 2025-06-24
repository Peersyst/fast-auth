# Getting Started

FastAuth is a NEAR Protocol authentication system that enables secure transaction signing through Multi-Party Computation (MPC) and JWT-based verification.

## Key Components

**FastAuth Contract** - Main entry point that manages guards and coordinates MPC signing

**JwtGuardRouter** - Routes JWT verification to appropriate guard contracts

**Auth0Guard** - Verifies Auth0-issued JWT tokens using RS256

## Quick Start

1. Review the [Architecture Overview](./architecture_overview.md)
2. Explore the [Contracts](./architecture_contracts_overview.md)
3. Choose your authentication method

## Learn More

- [Architecture Overview](./architecture_overview.md)
- [Contracts Overview](./architecture_contracts_overview.md)
- [FastAuth Contract](./architecture_contracts_fa.md)
- [JWT Guard Router](./architecture_contracts_jwt-guard-router.md)
- [Auth0 Guard](./architecture_contracts_auth0-guard.md)
