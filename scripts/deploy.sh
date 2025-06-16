#!/bin/bash

# ========== Helper: Read named parameters ==========
for arg in "$@"; do
  case $arg in
    --fundingMnemonic=*) FUNDING_MNEMONIC="${arg#*=}" ;;
    --fundingAccountId=*) FUNDING_ACCOUNT_ID="${arg#*=}" ;;
    --mnemonic=*) MNEMONIC="${arg#*=}" ;;
    --fastAuthAccountId=*) FAST_AUTH_ACCOUNT_ID="${arg#*=}" ;;
    --owner=*) OWNER="${arg#*=}" ;;
    --network=*) NETWORK="${arg#*=}" ;;
    --auth0N=*) AUTH0_N="${arg#*=}" ;;
    --auth0E=*) AUTH0_E="${arg#*=}" ;;
    --auth0Issuer=*) AUTH0_ISSUER="${arg#*=}" ;;
    *) echo "⚠️  Unknown argument: $arg" ;;
  esac
done

# ========== Fallback to env vars if not passed ==========
: "${FUNDING_MNEMONIC:=${FUNDING_MNEMONIC_ENV:-}}"
: "${FUNDING_ACCOUNT_ID:=${FUNDING_ACCOUNT_ID_ENV:-}}"
: "${MNEMONIC:=${MNEMONIC_ENV:-}}"
: "${FAST_AUTH_ACCOUNT_ID:=${FAST_AUTH_ACCOUNT_ID_ENV:-}}"
: "${OWNER:=${OWNER_ENV:-}}"
: "${NETWORK:=${NETWORK_ENV:-}}"
: "${AUTH0_N:=${AUTH0_N_ENV:-}}"
: "${AUTH0_E:=${AUTH0_E_ENV:-}}"
: "${AUTH0_ISSUER:=${AUTH0_ISSUER_ENV:-}}"

# ========== Validate dependencies ==========
echo "ℹ️   Checking required tools..."
for cmd in pnpm near; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "❌ Error: Required tool '$cmd' not found. Please install it before running this script."
    exit 1
  fi
done
echo "✅   All tools found"

# ========== Validate required variables ==========
missing_vars=()
for var in FUNDING_MNEMONIC FUNDING_ACCOUNT_ID MNEMONIC FAST_AUTH_ACCOUNT_ID OWNER NETWORK AUTH0_N AUTH0_E AUTH0_ISSUER; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
  echo "❌ Error: The following required variables are missing:"
  for var in "${missing_vars[@]}"; do echo "   - $var"; done
  echo
  echo "👉 You can provide them as parameters or environment variables."
  echo
  echo "📌 Example usage:"
  echo "./deploy.sh \\"
  echo "  --fundingMnemonic=\"your funding mnemonic\" \\"
  echo "  --fundingAccountId=\"funding-peersyst.testnet\" \\"
  echo "  --mnemonic=\"your fast auth mnemonic\" \\"
  echo "  --fastAuthAccountId=\"fastauthtest30.testnet\" \\"
  echo "  --owner=\"funding-peersyst.testnet\" \\"
  echo "  --network=\"testnet\" \\"
  echo "  --auth0N='[183,68,...]' \\"
  echo "  --auth0E='[1,0,1]'"
  echo "  --auth0Issuer='https://dev-m48tu8r7dug3x1f6.us.auth0.com'"
  echo
  echo "Or set them as environment variables before running:"
  echo "export FUNDING_MNEMONIC=... && ./deploy.sh"
  exit 1
fi

# ========== Derived variables ==========
export JWT_ACCOUNT_ID="jwt.${FAST_AUTH_ACCOUNT_ID}"
export AUTH0_JWT_ACCOUNT_ID="auth0.${JWT_ACCOUNT_ID}"

set -euo pipefail

# ========== Build ==========
echo "🚧   Building contracts..."
pnpm run build

# ========== Execution ==========
echo "🚧  Creating Fast Auth account: $FAST_AUTH_ACCOUNT_ID"
near --quiet account create-account fund-myself "$FAST_AUTH_ACCOUNT_ID" '8 NEAR' use-manually-provided-seed-phrase "$MNEMONIC" \
  sign-as "$FUNDING_ACCOUNT_ID" network-config "$NETWORK" \
  sign-with-seed-phrase "$FUNDING_MNEMONIC" --seed-phrase-hd-path "m/44'/397'/0'" \
  send
echo "✅   Fast Auth account created"
echo
sleep 5

echo "🚧  Creating JWT account: $JWT_ACCOUNT_ID"
near --quiet account create-account fund-myself "$JWT_ACCOUNT_ID" '4.5 NEAR' use-manually-provided-seed-phrase "$MNEMONIC" \
  sign-as "$FAST_AUTH_ACCOUNT_ID" network-config "$NETWORK" \
  sign-with-seed-phrase "$MNEMONIC" --seed-phrase-hd-path "m/44'/397'/0'" \
  send
echo "✅   JWT account created"
echo
sleep 5

echo "🚧  Creating Auth0 JWT account: $AUTH0_JWT_ACCOUNT_ID"
near --quiet account create-account fund-myself "$AUTH0_JWT_ACCOUNT_ID" '3 NEAR' use-manually-provided-seed-phrase "$MNEMONIC" \
  sign-as "$JWT_ACCOUNT_ID" network-config "$NETWORK" \
  sign-with-seed-phrase "$MNEMONIC" --seed-phrase-hd-path "m/44'/397'/0'" \
  send
echo "✅   Auth0 JWT account created"
echo
sleep 5

echo "🚧  Deploying contract to: $AUTH0_JWT_ACCOUNT_ID"
near --quiet contract deploy "$AUTH0_JWT_ACCOUNT_ID" use-file contracts/auth0-guard/target/near/auth0_guard.wasm \
  with-init-call init \
  json-args '{
    "owner":"'"${OWNER}"'",
    "n_component":'${AUTH0_N}',
    "e_component":'${AUTH0_E}'
  }' \
  prepaid-gas '100 TGas' \
  attached-deposit '0 NEAR' \
  network-config "$NETWORK" \
  sign-with-seed-phrase "$MNEMONIC" --seed-phrase-hd-path "m/44'/397'/0'" \
  send
echo "✅   Contract deployed to $AUTH0_JWT_ACCOUNT_ID"
echo

echo "🚧  Deploying contract to: $JWT_ACCOUNT_ID"
near --quiet contract deploy "$JWT_ACCOUNT_ID" use-file contracts/jwt-guard-router/target/near/jwt_guard_router.wasm \
  with-init-call init \
  json-args '{"owner":"'"${FAST_AUTH_ACCOUNT_ID}"'"}' \
  prepaid-gas '100 TGas' \
  attached-deposit '0 NEAR' \
  network-config "$NETWORK" \
  sign-with-seed-phrase "$MNEMONIC" --seed-phrase-hd-path "m/44'/397'/0'" \
  send
echo "✅   Contract deployed to $JWT_ACCOUNT_ID"
echo

echo "🚧  Deploying contract to: $FAST_AUTH_ACCOUNT_ID"
near --quiet contract deploy "$FAST_AUTH_ACCOUNT_ID" use-file contracts/fa/target/near/fa.wasm \
  with-init-call init \
  json-args '{
    "owner":"'"${OWNER}"'",
    "init_guards":{
      "jwt": "'"${JWT_ACCOUNT_ID}"'"
    }
  }' \
  prepaid-gas '100 TGas' \
  attached-deposit '0 NEAR' \
  network-config "$NETWORK" \
  sign-with-seed-phrase "$MNEMONIC" --seed-phrase-hd-path "m/44'/397'/0'" \
  send
echo "✅   Contract deployed to $FAST_AUTH_ACCOUNT_ID"
echo

echo "🚧  Adding Auth0 guard ($AUTH0_ISSUER) to $JWT_ACCOUNT_ID"
near --quiet contract call-function as-transaction "$JWT_ACCOUNT_ID" \
  add_guard json-args '{"guard_name":"'"$AUTH0_ISSUER"'","guard_account":"'"$AUTH0_JWT_ACCOUNT_ID"'"}' \
  prepaid-gas '100.0 Tgas' attached-deposit '0.1 NEAR' sign-as "$FUNDING_ACCOUNT_ID" network-config "$NETWORK" \
  sign-with-seed-phrase "$FUNDING_MNEMONIC" --seed-phrase-hd-path "m/44'/397'/0'" \
  send
echo "✅   Guard $AUTH0_ISSUER added to $JWT_ACCOUNT_ID"
echo

echo
echo "🎉   All accounts and contracts deployed successfully!"
