FROM --platform=linux/amd64 node:22.11.0 as base

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Rust and cargo near
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/download/cargo-near-v0.14.0/cargo-near-installer.sh | sh

RUN npm i -g pnpm@9.7.0


FROM base as integration

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install

COPY . .

RUN pnpm run lint
RUN pnpm run test
RUN pnpm run build
