package issuer

import (
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer/handler"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer/service"
)

// Module wires together the issuer service and handler.
type Module struct {
	handler *handler.IssuerHandler
}

// NewModule creates a new issuer Module with all dependencies.
func NewModule() *Module {
	svc := service.NewIssuerService()
	h := handler.NewIssuerHandler(svc)
	return &Module{handler: h}
}

// RegisterRoutes delegates route registration to the handler.
func (m *Module) RegisterRoutes(mux *http.ServeMux) {
	m.handler.RegisterRoutes(mux)
}
