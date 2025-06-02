# fast-auth

## Features

### Login

- Login through Auth0 to generate a plain JWT token.

### Sign and send transaction

- Generate a JWT with the transaction to sign.
- The sender should have a login JWT.
- The transaction actions must match NEAR actions.
- The JWT is sent to the contract to verify the transaction.
- The contract should autofill the transaction, sign it and send it to the network.

### Implementation

#### Auth0

##### Login

- Set up modal displaying
    - [ ] DApp name
    - [ ] DApp logo
- Return the JWT to the frontend

##### Sign and send transaction

- Inject tx custom claim with the transaction to sign.
- Set up modal displaying
    - [ ] Actions
        - [ ] Transfer
        - [ ] Function call
        - [ ] DeployContract
        - [ ] AddKey
        - [ ] DeleteKey
    - [ ] ReceiverID
- Return the signed transaction to the frontend.

#### Contract

- [ ] `add_guard` method permissionless
- [ ] sign the transaction on-chain.
- [ ] Return the signed transaction to the frontend.
