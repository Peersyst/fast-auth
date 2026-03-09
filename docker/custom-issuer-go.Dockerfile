# syntax=docker/dockerfile:1

# --- Build stage ---
FROM golang:1.26 AS build

WORKDIR /src
COPY apps/custom-issuer-go/go.mod apps/custom-issuer-go/go.sum ./
RUN go mod download

COPY apps/custom-issuer-go/ .

# Lint
RUN go vet ./...

# Test
RUN go test ./...

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /custom-issuer .

# --- Release stage ---
FROM gcr.io/distroless/static-debian13 AS release

COPY --from=build /custom-issuer /custom-issuer

ENTRYPOINT ["/custom-issuer"]
