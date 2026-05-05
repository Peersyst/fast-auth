# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} as integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Include landing
COPY apps/landing /project/apps/landing
# Install landing dependencies
RUN pnpm install --frozen-lockfile

# Check types landing
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run check-types --filter=landing
# Build landing
WORKDIR /project/apps/landing
RUN pnpm build



FROM gcr.io/distroless/nodejs22-debian12 as release
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=integration /project/apps/landing/.next/standalone ./
COPY --from=integration /project/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=integration /project/apps/landing/public ./apps/landing/public
CMD ["apps/landing/server.js"]
