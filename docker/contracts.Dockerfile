FROM rust:1.81-slim-bullseye as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install wasm32 target
RUN rustup target add wasm32-unknown-unknown

# Set working directory
WORKDIR /app

# Copy the contracts directory
COPY contracts/ contracts/

# Build and test each contract
WORKDIR /app/contracts/fa
RUN cargo build --target wasm32-unknown-unknown --release
RUN cargo test

WORKDIR /app/contracts/fa-guard
RUN cargo build --target wasm32-unknown-unknown --release
RUN cargo build --target wasm32-unknown-unknown --release -p external-guard
RUN cargo test

WORKDIR /app/contracts/fa-guard-jwt
RUN cargo build --target wasm32-unknown-unknown --release
RUN cargo build --target wasm32-unknown-unknown --release -p jwt_implementation
RUN cargo test

# Create a new stage to copy only the wasm files
FROM scratch
COPY --from=builder /app/contracts/fa/target/wasm32-unknown-unknown/release/*.wasm /
COPY --from=builder /app/contracts/fa-guard/target/wasm32-unknown-unknown/release/*.wasm /
COPY --from=builder /app/contracts/fa-guard-jwt/target/wasm32-unknown-unknown/release/*.wasm / 