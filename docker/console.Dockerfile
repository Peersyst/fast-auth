# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

COPY apps/console /project/apps/console
RUN pnpm install --frozen-lockfile

RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run check-types --filter=console --filter=console-web
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=console --filter=console-web
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run test --filter=console --filter=console-web
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run build --filter=console

RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    pnpm --filter=console deploy --prod /artifacts



FROM node:20.20.2-slim as release
ENV NODE_ENV=production
WORKDIR /app
COPY --from=integration /artifacts/dist /app/dist
COPY --from=integration /artifacts/openapi-spec.json /app/openapi-spec.json
COPY --from=integration /artifacts/node_modules /app/node_modules
USER node
CMD ["node", "dist/main.js"]
