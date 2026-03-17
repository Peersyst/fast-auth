# custom-issuer-rotation

AWS Lambda that rotates the KMS RSA signing keys used by the fast-auth stack.

## Architecture context

```text
custom-issuer (Go)                          attester (Node.js)
  │                                            │
  │ Signs JWTs via KMS                         │ Reads public keys from KMS
  │ (custom-issuer-current only)               │ (custom-issuer-previous,
  │                                            │  custom-issuer-current,
  │                                            │  custom-issuer-next)
  │                                            │
  ▼                                            ▼
AWS KMS                                  NEAR Attestation Contract
  custom-issuer-previous                   Stores the 3 public keys on-chain
  custom-issuer-current                    (requires attester quorum to update)
  custom-issuer-next                             │
                                                 ▼
                                        NEAR CustomIssuerGuard Contract
                                          Verifies JWTs using the
                                          public keys stored on-chain
```

- **custom-issuer** signs new JWTs using only `alias/custom-issuer-current`.
- **attester** fetches the public keys for all three aliases from KMS and submits them to the NEAR Attestation contract. It does not verify JWTs itself — it keeps the on-chain key set up to date.
- **CustomIssuerGuard** (NEAR contract) verifies JWTs using the public keys stored on-chain by the attester.

## Why three aliases

Three aliases exist so that key rotation never invalidates in-flight JWTs:

| Alias | Role |
|---|---|
| `alias/custom-issuer-previous` | Key from the previous period — JWTs signed with it are still valid on-chain |
| `alias/custom-issuer-current` | Active signing key |
| `alias/custom-issuer-next` | Pre-generated key — already attested on-chain before it becomes current |

Because the attester keeps all three public keys on-chain, JWTs signed with the old `current` key remain verifiable after rotation (it moves to `previous`). And because `next` is already on-chain before rotation day, the new `current` key is known to the guard the moment rotation happens — no transaction needed on rotation day.

## What the Lambda does

```text
Before:  prev=A   curr=B   next=C
After:   prev=B   curr=C   next=NEW   (A disabled, deleted in 7 days)
```

1. Reads the key IDs behind all three aliases.
2. Creates a new RSA 2048 `SIGN_VERIFY` key.
3. Disables the old `previous` key and schedules it for deletion in **7 days** (while it still carries its alias, so IAM can scope via `kms:ResourceAliases`).
4. Rotates aliases forward: `previous ← current ← next ← new key`.

After rotation the attester detects the key change, fetches the new set, and submits an updated attestation to the contract.

## Prerequisites

### One-time KMS alias bootstrap

The three aliases must exist before the first deployment:

```bash
PREV=$(aws kms create-key --key-spec RSA_2048 --key-usage SIGN_VERIFY \
  --query 'KeyMetadata.KeyId' --output text)
CURR=$(aws kms create-key --key-spec RSA_2048 --key-usage SIGN_VERIFY \
  --query 'KeyMetadata.KeyId' --output text)
NEXT=$(aws kms create-key --key-spec RSA_2048 --key-usage SIGN_VERIFY \
  --query 'KeyMetadata.KeyId' --output text)

aws kms create-alias --alias-name alias/custom-issuer-previous --target-key-id "$PREV"
aws kms create-alias --alias-name alias/custom-issuer-current  --target-key-id "$CURR"
aws kms create-alias --alias-name alias/custom-issuer-next     --target-key-id "$NEXT"
```

After bootstrapping, run the attester so it attests the initial key set to the contract before the custom-issuer starts issuing tokens.

## Return value

```json
{
  "previous": "<key-id now behind alias/custom-issuer-previous>",
  "current":  "<key-id now behind alias/custom-issuer-current>",
  "next":     "<new key-id behind alias/custom-issuer-next>",
  "scheduled_for_deletion":  "<key-id that was disabled and scheduled for deletion>"
}
```

## Error handling

Alias rotation is wrapped in a try/except that re-raises on failure, so the Lambda returns a non-200 status and CloudWatch logs the exact error. If rotation fails mid-way the alias state must be inspected and corrected manually before retrying.

Key retirement (disable + schedule deletion) runs **before** alias rotation so the key still carries its alias (allowing IAM to scope via `kms:ResourceAliases`). It is best-effort: a warning is logged on failure but rotation continues normally.

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions, including IAM role setup, Lambda creation, scheduling, and manual testing.
