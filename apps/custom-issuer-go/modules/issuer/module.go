package issuer

import (
	"errors"
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/modules"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer/handler"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer/service"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/kms"
)

var _ modules.AppModule = (*Module)(nil)

var ModuleName = "issuer"

// Module wires together the issuer service and handler.
type Module struct {
	handler *handler.IssuerHandler
	service *service.IssuerService
}

// Init initializes the module.
func (m *Module) Init(cfg *config.Config, appModules *modules.AppModules) error {
	appModules.GetModules()
	kmsModule, err := appModules.GetModule(kms.ModuleName)
	if err != nil {
		return err
	}
	kmsMod, ok := kmsModule.(*kms.Module)
	if !ok {
		return errors.New("unexpected kms module type")
	}

	svc, err := service.NewIssuerService(cfg, kmsMod.Service)
	if err != nil {
		return err
	}

	m.handler = handler.NewIssuerHandler(svc)
	m.service = svc
	return nil
}

// GetName returns the name of the module.
func (m *Module) GetName() string {
	return ModuleName
}

// RegisterRoutes delegates route registration to the handler.
func (m *Module) RegisterRoutes(mux *http.ServeMux) {
	m.handler.RegisterRoutes(mux)
}

// OnApplicationStart Application starts.
func (m *Module) OnApplicationStart() error {
	return nil
}

// OnApplicationStop Stop stops background key refresh. Safe to call multiple times.
func (m *Module) OnApplicationStop() error {
	m.service.Stop()
	return nil
}
