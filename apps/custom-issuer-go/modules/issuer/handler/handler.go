package handler

import (
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer/service"
)

// IssuerHandler handles HTTP requests for the issuer module.
type IssuerHandler struct {
	service *service.IssuerService
}

// NewIssuerHandler creates a new IssuerHandler.
func NewIssuerHandler(svc *service.IssuerService) *IssuerHandler {
	return &IssuerHandler{
		service: svc,
	}
}

// RegisterRoutes registers the issuer HTTP routes on the given mux.
func (h *IssuerHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /issuer/issue", h.handleIssue)
}
