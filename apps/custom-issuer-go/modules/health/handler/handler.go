package handler

import (
	"net/http"

	commonhandler "github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/handler"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/health/service"
)

// HealthHandler exposes liveness and readiness HTTP endpoints.
type HealthHandler struct {
	service *service.HealthService
}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler(svc *service.HealthService) *HealthHandler {
	return &HealthHandler{service: svc}
}

// RegisterRoutes registers the /livez and /readyz endpoints.
func (h *HealthHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /livez", h.handleLivez)
	mux.HandleFunc("GET /readyz", h.handleReadyz)
}

func (h *HealthHandler) handleLivez(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (h *HealthHandler) handleReadyz(w http.ResponseWriter, _ *http.Request) {
	result := h.service.CheckHealth()
	if result.Status == service.StatusOK {
		commonhandler.SendJSON(w, http.StatusOK, result)
	} else {
		commonhandler.SendJSON(w, http.StatusServiceUnavailable, result)
	}
}
