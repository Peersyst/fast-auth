# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include console
COPY apps/console /project/apps/console
# Install console dependencies
RUN pnpm install --frozen-lockfile

# Lint console
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=console
# Check types console
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run check-types --filter=console
# Test console
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run test --filter=console
# Build console
WORKDIR /project/apps/console
RUN pnpm build

WORKDIR /project
# Isolate console for production
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    pnpm --filter=console deploy --prod /artifacts



FROM gcr.io/distroless/nodejs20 as release
WORKDIR /app
COPY --from=integration /artifacts/dist /app/dist
COPY --from=integration /artifacts/node_modules /app/node_modules
ENV NODE_ENV=production
CMD [ "dist/src/main.js" ]
