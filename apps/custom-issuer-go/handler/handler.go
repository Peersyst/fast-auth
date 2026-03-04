package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer-go/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer-go/keys"
	"github.com/peersyst/fast-auth/apps/custom-issuer-go/logger"
)

type IssuerHandler struct {
	cfg      *config.Config
	keyStore *keys.FirebaseKeyStore
}

func NewIssuerHandler(cfg *config.Config, keyStore *keys.FirebaseKeyStore) *IssuerHandler {
	return &IssuerHandler{
		cfg:      cfg,
		keyStore: keyStore,
	}
}

func (h *IssuerHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /issuer/issue", h.withCORS(h.handleIssue))
	// CORS preflight handler
	mux.HandleFunc("OPTIONS /issuer/issue", h.withCORS(h.handleOptions))
}

// handleOptions responds to CORS preflight requests with 204 No Content.
func (h *IssuerHandler) handleOptions(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func (h *IssuerHandler) withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if len(h.cfg.AllowedOrigins) == 0 {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else {
				for _, allowed := range h.cfg.AllowedOrigins {
					if strings.EqualFold(origin, allowed) {
						w.Header().Set("Access-Control-Allow-Origin", origin)
						w.Header().Set("Vary", "Origin")
						break
					}
				}
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, PUT, PATCH, POST, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		next(w, r)
	}
}

func (h *IssuerHandler) sendError(w http.ResponseWriter, r *http.Request, statusCode int, message string) {
	resp := errorResponse{
		StatusCode: statusCode,
		Message:    message,
		Timestamp:  time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		Path:       r.URL.Path,
	}
	if statusCode >= 400 && statusCode < 500 {
		resp.Error = http.StatusText(statusCode)
	}

	if statusCode >= 500 {
		body := cachedBodyFromContext(r.Context())
		logger.Error("request error",
			"method", r.Method,
			"path", r.URL.Path,
			"ip", r.RemoteAddr,
			"userAgent", r.UserAgent(),
			"body", logger.RedactMap(body, 0),
			"headers", logger.RedactHeaders(r.Header),
			"query", r.URL.RawQuery,
			"error", message,
		)
	} else if statusCode >= 400 {
		logger.Warn("request error",
			"method", r.Method,
			"path", r.URL.Path,
			"error", message,
		)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(resp)
}
