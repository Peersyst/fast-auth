package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
)

const maxBodySize = 10 * 1024 // 10KB

type IssuerHandler struct {
	cfg *config.Config
}

func NewIssuerHandler(cfg *config.Config) *IssuerHandler {
	return &IssuerHandler{
		cfg: cfg,
	}
}

func (h *IssuerHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /issuer/issue", h.withCORS(h.handleIssue))
	mux.HandleFunc("OPTIONS /issuer/issue", h.withCORS(nil))
}

func (h *IssuerHandler) withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		originAllowed := false

		if origin != "" {
			if len(h.cfg.AllowedOrigins) == 0 {
				w.Header().Set("Access-Control-Allow-Origin", "*")
				originAllowed = true
			} else {
				for _, allowed := range h.cfg.AllowedOrigins {
					if strings.EqualFold(origin, allowed) {
						w.Header().Set("Access-Control-Allow-Origin", origin)
						w.Header().Set("Vary", "Origin")
						originAllowed = true
						break
					}
				}
				if !originAllowed {
					http.Error(w, "Forbidden", http.StatusForbidden)
					return
				}
			}
		}

		if originAllowed {
			w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, PUT, PATCH, POST, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

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
			"body", body,
			"headers", r.Header,
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
