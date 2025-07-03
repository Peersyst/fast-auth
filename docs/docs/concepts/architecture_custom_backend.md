# Custom backend

When integrating FastAuth, you can choose to use a custom backend to handle the authentication and authorization of the user. This is useful if you want to use a different authentication provider or if you want to use a different authorization model.

:::warning

Implementing a custom backend may require additional development and maintenance, as you will need to implement the authentication and authorization logic for your specific use case.

:::

## Aspects to consider

When implementing a custom backend, there are several aspects to consider:

- **Custom authentication**: You will need to implement the authentication logic for your specific use case. This may include implementing a login page, a logout page, and a user profile page. In addition, you will need to implement the logic to verify the user's identity and ensure the transaction or delegated action is authorized.
- **Security**: You will need to ensure that no keys or secrets are exposed to the client. This is important to prevent unauthorized access to your resources.

## Example

If you want to integrate a custom backend, you can follow this [integration guide](../integrations/custom-backend.md). It will guide you through the process of integrating a custom backend with FastAuth.

If you are looking for an example of a custom backend, you can check out the [Express](../integrations/custom-backend-express.md) example. It shows how to develop a custom backend using [Express.js](https://expressjs.com/), taking care of the authentication and authorization logic.
