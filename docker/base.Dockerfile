# syntax=docker/dockerfile:1
FROM node:20.9.0 as base
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM
WORKDIR /project
# Install pnpm
RUN npm install -g pnpm@9.7.0
# Add project files
COPY . /project
# Install package and app dependencies
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN pnpm install
# Run dist packages
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN pnpm run bundle
# Run linting
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN pnpm run lint:packages
# Run checking types
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN pnpm run check-types:packages
# Run testing
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN pnpm run test:packages
