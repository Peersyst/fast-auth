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
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 22.11.0

# install nvm
RUN curl --silent -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash

# install node and npm
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN nvm install 22
RUN nvm use 22
RUN npm i -g pnpm@9.7.0


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
