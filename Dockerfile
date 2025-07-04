FROM --platform=linux/amd64 node:22.11.0 as base
# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Rust and cargo near
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup toolchain install 1.86
RUN rustup default 1.86
RUN rustup target add wasm32-unknown-unknown
RUN rustup component add rustfmt clippy
RUN curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/download/cargo-near-v0.16.0/cargo-near-installer.sh | sh

RUN npm i -g pnpm@9.7.0


FROM base as integration

WORKDIR /app

COPY . .

RUN pnpm install

RUN pnpm run build:packages
RUN pnpm run lint:packages
RUN pnpm run test:packages
