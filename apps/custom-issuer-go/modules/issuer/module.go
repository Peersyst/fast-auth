package issuer

import (
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer/handler"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer/service"
)

// Module wires together the issuer service and handler.
type Module struct {
	handler *handler.IssuerHandler
	service *service.IssuerService
}

// NewModule creates a new issuer Module with all dependencies.
// It fetches Firebase public keys and starts background rotation.
func NewModule(cfg *config.Config, signer service.Signer) (*Module, error) {
	svc, err := service.NewIssuerService(cfg, signer)
	if err != nil {
		return nil, err
	}

	h := handler.NewIssuerHandler(svc)
	return &Module{handler: h, service: svc}, nil
}

// RegisterRoutes delegates route registration to the handler.
func (m *Module) RegisterRoutes(mux *http.ServeMux) {
	m.handler.RegisterRoutes(mux)
}

// Stop stops background key refresh. Safe to call multiple times.
func (m *Module) Stop() {
	m.service.Stop()
}
