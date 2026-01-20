# Custom Issuer Service

The Custom Issuer Service is a NestJS backend application that bridges external identity providers (like Firebase) with the FastAuth `CustomIssuerGuard`. It validates incoming JWTs from your identity provider and re-issues them with a custom signing key that the guard can verify.

:::warning
This service is **required** when using the `CustomIssuerGuard`. The guard verifies JWTs signed by this service, not directly from your identity provider.
:::

## Overview

The service acts as a JWT re-signing proxy:

1. **Receives** a JWT from your identity provider (e.g., Firebase).
2. **Validates** the JWT signature and claims against the provider's public keys.
3. **Re-issues** a new JWT signed with your custom RSA private key.
4. The new JWT can then be used with the `CustomIssuerGuard`.

This architecture allows you to:
- Use any OIDC-compliant identity provider.
- Control the signing keys used for FastAuth verification.
- Add custom validation logic before re-issuing tokens.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────┐
│   User      │────▶│ Identity Provider│────▶│ Custom Issuer     │────▶│ FastAuth     │
│             │     │ (e.g., Firebase) │     │ Service           │     │ Contracts    │
└─────────────┘     └──────────────────┘     └───────────────────┘     └──────────────┘
                           │                         │
                           ▼                         ▼
                    Issues JWT with            Re-issues JWT with
                    provider's key             custom signing key
```

## API Endpoint

### Issue Token

```http
POST /issuer/issue
Content-Type: application/json

{
  "jwt": "<your-identity-provider-jwt>"
}
```

**Response:**

```json
{
  "token": "<re-issued-jwt>"
}
```

The service:
1. Validates the input JWT signature against the configured validation public keys.
2. Verifies the `iss` claim matches the expected issuer.
3. Validates `exp` (expiration) and `nbf` (not before) claims.
4. Extracts the `sub` (subject) claim.
5. Issues a new JWT with:
   - Same `sub`, `exp`, and `nbf` claims.
   - New `iss` claim set to the service's issuer URL.
   - Signed with the service's RSA private key.

## Configuration

The service requires the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `KEY_BASE64` | Yes | Base64-encoded RSA private key for signing tokens |
| `VALIDATION_PUBLIC_KEY_URL` | Yes | URL to fetch the identity provider's public keys (e.g., Firebase certificate URL) |
| `VALIDATION_ISSUER_URL` | Yes | Expected `iss` claim in incoming JWTs |
| `ISSUER_URL` | Yes | The `iss` claim to include in re-issued JWTs |
| `PORT` | No | Server port (default: 3000) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |

### Example Configuration

```bash
# Base64-encoded RSA private key
KEY_BASE64="LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLS4uLg=="

# Firebase public key URL (replace with your service account email)
VALIDATION_PUBLIC_KEY_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"

# Firebase issuer URL (replace with your project ID)
VALIDATION_ISSUER_URL="https://securetoken.google.com/your-project-id"

# Your custom issuer URL (must match what's configured in CustomIssuerGuard)
ISSUER_URL="https://your-custom-issuer.example.com"

PORT=3000
```

## Key Generation

Generate an RSA key pair for signing:

```bash
# Generate RSA private key
openssl genrsa -out signing-key.pem 2048

# Extract public key (for configuring the guard contract)
openssl rsa -in signing-key.pem -pubout -out signing-public-key.pem

# Encode private key as base64 for KEY_BASE64 env var
cat signing-key.pem | base64

# Set proper permissions
chmod 600 signing-key.pem
```

## Running the Service

### Development

```bash
cd apps/custom-issuer

# Install dependencies
pnpm install

# Start in development mode (with hot reload)
pnpm start:dev
```

### Production

```bash
# Build
pnpm build

# Start
pnpm start:prod
```

### Docker

The service can be containerized using the provided Dockerfile:

```bash
docker build -f docker/custom-issuer.Dockerfile -t custom-issuer .
docker run -p 3000:3000 --env-file .env custom-issuer
```

## Integration with CustomIssuerGuard

To use this service with the `CustomIssuerGuard`:

1. **Deploy the Custom Issuer Service** with your RSA key pair.

2. **Extract the public key components** for the guard contract:
   ```bash
   # Get the modulus (n) and exponent (e) from your public key
   openssl rsa -pubin -in signing-public-key.pem -text -noout
   ```

3. **Configure the CustomIssuerGuard** with your public key:
   ```rust
   // When initializing or updating the guard
   set_public_keys(vec![JwtPublicKey {
       n: vec![...],  // RSA modulus bytes
       e: vec![1, 0, 1],  // RSA exponent (typically 65537)
   }])
   ```

4. **User Flow**:
   - User authenticates with your identity provider (e.g., Firebase).
   - Your app sends the Firebase JWT to the Custom Issuer Service.
   - Service returns a re-issued JWT.
   - User registers with `CustomIssuerGuard` by calling `storage_deposit()` and `claim_oidc()`.
   - User can now use the re-issued JWT with `FastAuth.sign()`.

## Security Considerations

- **Protect the signing key**: The RSA private key should be stored securely and never exposed.
- **Use HTTPS**: Always deploy behind HTTPS in production.
- **Rate limiting**: Implement rate limiting to prevent abuse.
- **Validate origins**: Configure `ALLOWED_ORIGINS` for CORS protection.
- **Key rotation**: Plan for key rotation by updating both the service and guard contract.

## Validation Logic

The service performs the following validations on incoming JWTs:

1. **Signature**: Verified against public keys fetched from `VALIDATION_PUBLIC_KEY_URL`.
2. **Issuer (`iss`)**: Must match `VALIDATION_ISSUER_URL`.
3. **Expiration (`exp`)**: Token must not be expired.
4. **Not Before (`nbf`)**: Token must be valid (current time >= nbf).
5. **Subject (`sub`)**: Must be present and non-empty.

If any validation fails, the service returns a 401 Unauthorized error.
