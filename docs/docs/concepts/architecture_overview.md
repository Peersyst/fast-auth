# Overview

To start understanding how FastAuth works, here we list the main components of the architecture and how they interact with each other.

FastAuth is a system that enables users to sign blockchain transactions using their existing Web2 identities (e.g., Google, Auth0, Firebase) through a Multi-Party Computation (MPC) network. The architecture is composed of three main layers:

1. **Smart Contracts** - On-chain contracts that manage authentication, verification, and coordinate with the MPC network for signing.
2. **MPC Network** - A distributed network that holds key shares and produces signatures without any single party having access to the full private key.
3. **Custom Backend (Optional)** - Off-chain services that can be used to implement custom authentication flows.

## Key Components

- [Contracts](./architecture_contracts_overview.md) - The on-chain smart contracts that form the core of FastAuth.
- [MPC](./architecture_mpc.md) - The Multi-Party Computation network used for distributed key management and signing.
- [Custom Backend](./architecture_custom_backend.md) - Guidelines for implementing custom authentication backends.
