ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include relayer
COPY apps/relayer /project/apps/relayer
# Install relayer dependencies
RUN pnpm install

# Lint relayer
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=relayer
# Check types relayer
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run check-types --filter=relayer
# Test relayer
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run test --filter=relayer
# Build relayer
WORKDIR /project/apps/relayer
RUN pnpm build

WORKDIR /project
# Isolate relayer for production
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    pnpm --filter=relayer deploy --prod /artifacts


FROM gcr.io/distroless/nodejs20 as release
ENV NODE_ENV=production
WORKDIR /app
COPY --from=integration /artifacts/dist /app/dist
COPY --from=integration /artifacts/node_modules /app/node_modules
CMD [ "dist/src/main/main.js" ]
