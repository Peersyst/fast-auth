# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include migration script
COPY scripts/migration /project/scripts/migration

# Install migration script dependencies
RUN pnpm install

# Lint migration script
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=@fast-auth/migration

WORKDIR /project/scripts/migration