# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include custom-issuer
COPY apps/custom-issuer /project/apps/custom-issuer
# Install custom-issuer dependencies
RUN pnpm install

# Lint custom-issuer
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=custom-issuer
# Check types custom-issuer
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run check-types --filter=custom-issuer
# Test custom-issuer
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run test --filter=custom-issuer
# Build custom-issuer
WORKDIR /project/apps/custom-issuer
RUN pnpm build

WORKDIR /project
# Isolate custom-issuer for production
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    pnpm --filter=custom-issuer deploy --prod /artifacts



FROM node:20.10.0 as release
ENV NODE_ENV=production
WORKDIR /app
COPY --from=integration /artifacts/dist /app/dist
COPY --from=integration /artifacts/node_modules /app/node_modules
CMD [ "/app/dist/src/main" ]
