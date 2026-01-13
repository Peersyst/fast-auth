# Custom Issuer Service

A NestJS service that validates incoming JWTs and issues new tokens with a different signing key.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Generate Test Keys (Optional)

```bash
# Generate RSA key pair for testing
mkdir -p keys
openssl genrsa -out keys/signing-key.pem 2048
openssl rsa -in keys/signing-key.pem -pubout -out keys/validation-public-key.pem
chmod 600 keys/signing-key.pem
chmod 644 keys/validation-public-key.pem
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required variables:
- `KEY_PATH` - Path to the RSA private key for signing tokens
- `VALIDATION_PUBLIC_KEY_PATH` - Path to the RSA public key for validating input JWTs
- `ISSUER_URL` - URL of the issuer service (e.g., `http://localhost:3000`)

Optional variables:
- `PORT` - Server port (default: 3000)
- `ALLOWED_ORIGINS` - Comma-separated CORS origins
- `KEYS_BASE_PATH` - Base directory for key files (default: current directory)

### 4. Start the Service

```bash
# Development mode (with hot reload)
pnpm start:dev

# Production mode
pnpm build
pnpm start:prod
```

The service will be available at `http://localhost:3000` (or your configured port).

## Usage

### Issue a Token

```bash
POST /issuer/issue
Content-Type: application/json

{
  "jwt": "your-validated-jwt-token"
}
```

The service will:
1. Validate the input JWT using the validation public key
2. Extract `sub`, `exp`, and `nbf` claims
3. Issue a new token signed with the signing private key
4. Include the `iss` claim with the issuer URL

### Generate Test JWTs

```bash
# Generate and send a test JWT to the service
pnpm generate:jwt

# Generate with custom options
pnpm generate:jwt -- --sub "user@example.com" --exp 7200
```

## Scripts

- `pnpm start:dev` - Start in development mode with hot reload
- `pnpm build` - Build for production
- `pnpm start:prod` - Start production server
- `pnpm test` - Run tests
- `pnpm generate:jwt` - Generate test JWT tokens

## Security

- Input validation with `class-validator`
- Request size limits (10KB)
- CORS protection
- Path traversal protection for key files
- Sensitive data redaction in error logs
- Rate limiting recommended for production
