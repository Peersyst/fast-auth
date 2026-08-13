# @fast-auth/auth0

The Auth0 half of FastAuth: a PostLogin action that turns a signing request into a user
approval, and the forms that render it.

## How it fits together

FastAuth's guarantee is that the MPC only ever signs bytes Auth0 certified after showing them
to the user. The on-chain guard enforces one half of that — it checks that the bytes handed to
the MPC equal the `fatxn` claim in the access token, and nothing else. It never inspects them.

The other half lives here. The action is what decides *what* those bytes are allowed to be and
*how* they are described to the user before the token is minted.

```
/authorize?<payload>  →  action decodes + validates  →  form renders for approval
                                                     →  approved: fatxn = the exact bytes
                                                     →  denied:   no token
```

Because the guard compares byte for byte, the action must place the payload in `fatxn`
unmodified. Any normalisation here would make every resulting signature fail on-chain.

## Payload types

The action accepts exactly one payload per request, on the `/authorize` query string:

| Query key       | Contents                              | Form rendered          |
| --------------- | ------------------------------------- | ---------------------- |
| `transaction`   | Borsh-encoded NEAR `Transaction`      | `TRANSACTION_FORM`     |
| `delegateAction`| Borsh-encoded `DelegateAction`        | `DELEGATE_ACTION_FORM` |
| `nep413`        | Borsh-encoded NEP-413 message payload | `NEP413_FORM`          |

Sending more than one is rejected: with several present, precedence would decide silently which
one lands in `fatxn`, and a caller could display one payload while a different one gets signed.

A payload that fails to decode is denied rather than rendered. If the screen cannot describe it,
the user cannot meaningfully approve it.

## Action secrets

Configured under **Actions → Library → your action → Secrets**. Despite the name, only the
audience is remotely sensitive — the form entries are identifiers Auth0 generates on import, and
they differ per tenant, which is why they are configuration rather than constants in the code.

| Secret                 | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| `ONCHAIN_AUDIENCE`     | Identifier of the signing API. A request carrying a payload is only honoured for this audience, and a request *for* this audience without a payload is denied. |
| `TRANSACTION_FORM`     | Form id for transaction approvals.                        |
| `DELEGATE_ACTION_FORM` | Form id for delegate action approvals.                    |
| `NEP413_FORM`          | Form id for NEP-413 message approvals.                    |

## Deploying a form

Forms are built from source rather than edited in the dashboard: `build.js` inlines each
component's JS, CSS and schema into a template and emits a single importable file.

```bash
pnpm build     # writes src/forms/<form>/<form>_form.json
```

Then, per form:

1. **Auth0 Dashboard → Forms → Create Form → Import from JSON**, and upload the generated file.
2. Copy the id Auth0 assigns to the created form.
3. Paste it into the matching action secret above.

Repeat per tenant — ids are not portable between staging and production.

Re-importing after a code change creates a *new* form with a new id, so remember to update the
secret, or the action will keep rendering the previous version.

## Local development

```bash
pnpm playground   # serves the forms at http://localhost:5174
```

The playground renders the same components against mock payloads (`playground/payloads.js`)
with a shim standing in for the helpers that `build.js` inlines in production. It is the fastest
way to iterate on an approval screen without touching a tenant.

```bash
pnpm test         # action decoding, handler dispatch, and form rendering
```

The fixtures encode payloads with NEAR's production encoders, and the NEP-413 fixtures use a
borsh schema transcribed from the NEP rather than imported from the action — so a change to the
action's schema breaks the round-trip instead of silently agreeing with itself.

## Adding a form

1. `src/forms/<name>/<name>_form_base.json` — the template. Custom components carry
   `"$source": "<folder>"`, resolved against the form's own directory, or against the forms root
   when the path contains a `/` (e.g. `shared/image`).
2. `src/forms/<name>/details/index.js` and `index.css` — the component. Rendering helpers live in
   `shared/helpers` and are available as `__auth0FormHelpers`.
3. Register the form in the `FORMS` array in `build.js`.
4. Add the corresponding secret and render it from the action.
