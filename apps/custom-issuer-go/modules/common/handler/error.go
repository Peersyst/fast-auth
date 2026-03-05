package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/middleware"
)

// httpErrorResponse matches NestJS HttpException.getResponse() format.
// Used for 4xx errors.
type httpErrorResponse struct {
	StatusCode int    `json:"statusCode"`
	Message    any    `json:"message"`
	Error      string `json:"error"`
}

// internalErrorResponse matches NestJS HttpExceptionFilter non-HttpException format.
// Used for 5xx errors.
type internalErrorResponse struct {
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message"`
	Timestamp  string `json:"timestamp"`
	Path       string `json:"path"`
}

// SendValidationErrors writes a 400 JSON response with message as an array.
// Matches NestJS ValidationPipe error format.
func SendValidationErrors(w http.ResponseWriter, r *http.Request, messages []string) {
	logger.Warn("validation error",
		"method", r.Method,
		"path", r.URL.Path,
		"errors", messages,
	)

	SendJSON(w, http.StatusBadRequest, httpErrorResponse{
		StatusCode: http.StatusBadRequest,
		Message:    messages,
		Error:      http.StatusText(http.StatusBadRequest),
	})
}

// SendError writes a JSON error response and logs the error.
// For 4xx: matches NestJS HttpException format (no timestamp/path).
// For 5xx: matches NestJS non-HttpException format (with timestamp/path).
func SendError(w http.ResponseWriter, r *http.Request, statusCode int, message string) {
	if statusCode >= 500 {
		body := middleware.CachedBodyFromContext(r.Context())
		logger.Error("request error",
			"method", r.Method,
			"path", r.URL.Path,
			"ip", r.RemoteAddr,
			"userAgent", r.UserAgent(),
			"body", body,
			"headers", r.Header,
			"query", r.URL.RawQuery,
			"error", message,
		)
		SendJSON(w, statusCode, internalErrorResponse{
			StatusCode: statusCode,
			Message:    message,
			Timestamp:  time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
			Path:       r.URL.Path,
		})
		return
	}

	if statusCode >= 400 {
		logger.Warn("request error",
			"method", r.Method,
			"path", r.URL.Path,
			"error", message,
		)
	}

	SendJSON(w, statusCode, httpErrorResponse{
		StatusCode: statusCode,
		Message:    message,
		Error:      http.StatusText(statusCode),
	})
}

// SendJSON writes a JSON response with the given status code.
func SendJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(data)
}
