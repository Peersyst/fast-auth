# auth0

What NEAR Auth runs inside its Auth0 tenants: the post-login action, the consent forms it renders, and the sandbox tenant's login page template. Nothing here deploys itself. Each piece is copied into the tenant by hand.

| Path                                  | What it is                                                                                                                               | Where it goes                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `src/actions/authorize-app.action.js` | The post-login action. It gates the signing audience, decodes the payload, renders the matching consent form and sets the `fatxn` claim. | Actions → Library, bound to the Login flow. |
| `src/forms/<form>/<form>_form.json`   | The consent forms, built by `pnpm build` from each `<form>_form_base.json` and its components.                                           | Forms → Import from JSON.                   |
| `src/universal-login/sandbox.liquid`  | The login page template with the sandbox notice. Sandbox tenant only.                                                                    | Management API, below.                      |

## Action secrets

| Secret                                                    | Value                                                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ONCHAIN_AUDIENCE`                                        | The signing API's identifier, which is the account of the guard that verifies its tokens.                                                 |
| `TRANSACTION_FORM`, `DELEGATE_ACTION_FORM`, `NEP413_FORM` | The id of each imported form.                                                                                                             |
| `SANDBOX`                                                 | `"true"` on the sandbox tenant only. Every consent form then shows the sandbox notice as its first block. Leave it unset everywhere else. |

The forms are the same on every tenant: the notice block renders nothing when the action leaves it empty. Deploy the action before importing forms that read a new field.

## The sandbox

The sandbox tenant is the testnet one, `login.testnet.fast-auth.com`. Any dApp signs users in on it through the sandbox broker, which uses one Auth0 client for all of them. That client has `broker: "true"` in its metadata, and the broker passes the dApp's origin to `/authorize` as `dapp_origin`. The consent screen shows that origin as the app's name, so the action refuses a broker login without a valid one.

The login page shows the notice too. Set the template with a Management API token that has `update:branding`:

```bash
jq -Rs '{template: .}' packages/auth0/src/universal-login/sandbox.liquid | curl -sf -X PUT "https://<tenant>.<region>.auth0.com/api/v2/branding/templates/universal-login" -H "Authorization: Bearer $AUTH0_MGMT_TOKEN" -H "Content-Type: application/json" --data-binary @-
```

The template and `SANDBOX_NOTICE` in the action carry the same text. `test/sandbox.spec.js` fails when they drift.
