# syntax=docker/dockerfile:1

# --- Build stage ---
FROM --platform=$BUILDPLATFORM golang:1.26 AS build
ARG TARGETOS
ARG TARGETARCH

WORKDIR /src
COPY apps/custom-issuer-go/go.mod apps/custom-issuer-go/go.sum ./
RUN go mod download

COPY apps/custom-issuer-go/ .

# Lint
RUN go vet ./...

# Test
RUN go test ./...

# Build static binary
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /custom-issuer .

# --- Release stage ---
FROM gcr.io/distroless/static-debian13:nonroot AS release

COPY --from=build /custom-issuer /custom-issuer

ENTRYPOINT ["/custom-issuer"]
