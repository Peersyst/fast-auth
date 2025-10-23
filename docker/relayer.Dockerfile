# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include api
COPY apps/api /project/apps/api
# Install api dependencies
RUN pnpm install

# Lint api
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=api
# Check types api
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run check-types --filter=api
# Test api
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run test --filter=api
# Build api
WORKDIR /project/apps/api
RUN pnpm build

WORKDIR /project
# Isolate api for production
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    pnpm --filter=api deploy --prod /artifacts



FROM node:20.10.0 as release
ENV NODE_ENV=production
WORKDIR /app
COPY --from=integration /artifacts/dist /app/dist
COPY --from=integration /artifacts/node_modules /app/node_modules
CMD [ "/app/dist/src/main" ]
