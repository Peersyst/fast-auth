package health

import (
	"errors"
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/modules"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/health/handler"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/health/service"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/kms"
)

var _ modules.AppModule = (*Module)(nil)

var ModuleName = "health"

// Module wires together the health service.
type Module struct {
	handler *handler.HealthHandler
}

// Init initializes the module.
func (m *Module) Init(_ *config.Config, appModules *modules.AppModules) error {
	issuerModule, err := appModules.GetModule(issuer.ModuleName)
	if err != nil {
		return err
	}
	issuerMod, ok := issuerModule.(*issuer.Module)
	if !ok {
		return errors.New("unexpected issuer module type")
	}

	kmsModule, err := appModules.GetModule(kms.ModuleName)
	if err != nil {
		return err
	}
	kmsMod, ok := kmsModule.(*kms.Module)
	if !ok {
		return errors.New("unexpected kms module type")
	}

	svc := service.NewHealthService(issuerMod.Service, kmsMod.Service)
	m.handler = handler.NewHealthHandler(svc)
	return nil
}

// GetName returns the name of the module.
func (m *Module) GetName() string { return ModuleName }

// RegisterRoutes delegates route registration to the handler.
func (m *Module) RegisterRoutes(mux *http.ServeMux) { m.handler.RegisterRoutes(mux) }

// OnApplicationStart is a no-op for the health module.
func (m *Module) OnApplicationStart() error { return nil }

// OnApplicationStop is a no-op for the health module.
func (m *Module) OnApplicationStop() error { return nil }
