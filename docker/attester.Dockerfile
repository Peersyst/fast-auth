# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include attester
COPY apps/attester /project/apps/attester
# Install attester dependencies
RUN pnpm install

# Lint attester
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=attester
# Check types attester
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run check-types --filter=attester
# Test attester
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run test --filter=attester
# Build attester
WORKDIR /project/apps/attester
RUN pnpm build

WORKDIR /project
# Isolate attester for production
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    pnpm --filter=attester deploy --prod /artifacts



FROM node:20.10.0 as release
ENV NODE_ENV=production
WORKDIR /app
COPY --from=integration /artifacts/dist /app/dist
COPY --from=integration /artifacts/node_modules /app/node_modules
CMD [ "node", "/app/dist" ]
