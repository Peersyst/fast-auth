package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
)

type contextKey int

const cachedBodyKey contextKey = iota

// cachedBodyFromContext returns the parsed request body stored by RecoveryMiddleware.
func cachedBodyFromContext(ctx context.Context) map[string]any {
	v, _ := ctx.Value(cachedBodyKey).(map[string]any)
	return v
}

// RecoveryMiddleware reads and caches the request body, then recovers from
// panics in downstream handlers, returning a 500 JSON response.
func RecoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Cap the read to maxBodySize to prevent extra-large bodies from
		// consuming excessive memory; the issuer handler rejects bodies
		// above this limit anyway, so truncation here is acceptable.
		bodyBytes, _ := io.ReadAll(io.LimitReader(r.Body, maxBodySize))
		_ = r.Body.Close()
		r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

		var bodyMap map[string]any
		// If the body doesn't receive a JSON we don't need it.
		_ = json.Unmarshal(bodyBytes, &bodyMap)
		// The parsed body is stored in the request context so the panic
		// recovery handler can include it in diagnostic logs.
		r = r.WithContext(context.WithValue(r.Context(), cachedBodyKey, bodyMap))

		defer func() {
			if rec := recover(); rec != nil {
				stack := string(debug.Stack())
				body := cachedBodyFromContext(r.Context())

				logger.Error("panic recovered",
					"method", r.Method,
					"path", r.URL.Path,
					"ip", r.RemoteAddr,
					"userAgent", r.UserAgent(),
					"body", logger.RedactMap(body, 0),
					"headers", logger.RedactHeaders(r.Header),
					"query", r.URL.RawQuery,
					"panic", fmt.Sprintf("%v", rec),
					"stack", stack,
				)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(errorResponse{
					StatusCode: http.StatusInternalServerError,
					Message:    "Internal server error",
					Timestamp:  time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
					Path:       r.URL.Path,
				})
			}
		}()

		next.ServeHTTP(w, r)
	})
}
