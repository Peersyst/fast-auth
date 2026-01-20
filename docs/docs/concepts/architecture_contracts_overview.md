# Overview

One of the key components of the FastAuth architecture are the smart contracts. These contracts enable the interaction between the end-user and the MPC network to sign transactions or payloads securely.

The contract system is designed with modularity in mind, allowing different authentication providers (Auth0, Firebase, custom issuers) to be plugged in as guard contracts. This architecture enables:

- **Flexible Authentication**: Support for multiple identity providers through interchangeable guard contracts.
- **Secure Signing**: JWT verification and MPC-based signature generation.
- **Decentralized Key Management**: Through the attestation contract and MPC network.

To understand how these contracts work, check the following sections:

## Global Architecture

For the overall contract architecture and how components interact, see the [Architecture](./architecture_contracts_architecture.md) section.

## Core Contracts

- [FastAuth](./architecture_contracts_fa.md) - The main entry point contract that coordinates authentication and MPC signing.
- [JwtGuardRouter](./architecture_contracts_jwt-guard-router.md) - Routes JWT verification requests to the appropriate guard contract.

## Guard Contracts

Guard contracts implement JWT verification logic for specific identity providers:

- [Auth0Guard](./architecture_contracts_auth0-guard.md) - Verifies JWT tokens issued by Auth0.
- [FirebaseGuard](./architecture_contracts_firebase-guard.md) - Verifies JWT tokens issued by Firebase with attestation-based key management.
- [CustomIssuerGuard](./architecture_contracts_custom-issuer-guard.md) - Verifies JWT tokens from custom OIDC providers with claim-based authentication.

## Supporting Contracts

- [Attestation](./architecture_contracts_attestation.md) - Manages decentralized public key attestation through a quorum-based system.
