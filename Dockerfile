FROM --platform=linux/amd64 ubuntu:22.04 as base

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Rust and cargo near
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/download/cargo-near-v0.14.0/cargo-near-installer.sh | sh

# Node and pnpm
ENV NVM_DIR=/root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash \
    && . "$NVM_DIR/nvm.sh" \
    && nvm install 20 \
    && nvm use 20 \
    && npm install -g pnpm@latest \
    && echo 'export PATH="$NVM_DIR/versions/node/$(nvm current)/bin:$PATH"' >> /root/.bashrc

# Add NVM binaries to PATH
ENV PATH="/root/.nvm/versions/node/v20.9.0/bin:${PATH}"


FROM base as integration

WORKDIR /app

# Ensure NVM environment is properly set up
SHELL ["/bin/bash", "--login", "-c"]

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install

COPY . .

RUN pnpm run lint
RUN pnpm run test
RUN pnpm run build

# Add a default CMD to run when the container starts
CMD ["bash", "--login"]
