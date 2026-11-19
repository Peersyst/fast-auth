# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include sandbox-broker
COPY apps/sandbox-broker /project/apps/sandbox-broker
# Install sandbox-broker dependencies
RUN pnpm install --frozen-lockfile

# Lint, check types and test sandbox-broker
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint check-types test --filter=sandbox-broker
# Build sandbox-broker
WORKDIR /project/apps/sandbox-broker
RUN pnpm build

WORKDIR /project
# Isolate sandbox-broker for production
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    pnpm --filter=sandbox-broker deploy --prod /artifacts



FROM gcr.io/distroless/nodejs20 as release
WORKDIR /app
COPY --from=integration /artifacts/dist /app/dist
COPY --from=integration /artifacts/node_modules /app/node_modules
ENV NODE_ENV=production
CMD [ "dist/main.js" ]
