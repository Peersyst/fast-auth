# syntax=docker/dockerfile:1
ARG BASE_IMAGE=base
FROM ${BASE_IMAGE} AS integration
ARG TURBO_TEAM=peersyst
ENV TURBO_TEAM=$TURBO_TEAM

# Install Go runtime
COPY --from=golang:1.26 /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}"

# Include custom-issuer-go
COPY apps/custom-issuer-go /project/apps/custom-issuer-go

# Download custom-issuer-go Go module dependencies
RUN cd /project/apps/custom-issuer-go && go mod download

# Lint custom-issuer-go
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run lint --filter=custom-issuer-go
# Test custom-issuer-go
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run test --filter=custom-issuer-go
# Build custom-issuer-go
WORKDIR /project/apps/custom-issuer-go
RUN --mount=type=secret,id=turbo_token,env=TURBO_TOKEN \
    npx turbo run build --filter=custom-issuer-go



FROM alpine:3.23 AS release
WORKDIR /app
COPY --from=integration /project/apps/custom-issuer-go/custom-issuer-go /app/custom-issuer-go
ENTRYPOINT ["/app/custom-issuer-go"]
