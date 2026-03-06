package kms

import (
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/modules"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/kms/service"
)

var _ modules.AppModule = (*Module)(nil)

var ModuleName = "kms"

// Module wires together the KMS service.
type Module struct {
	Service *service.KMSService
}

// Init initializes the module.
func (m *Module) Init(cfg *config.Config, _ *modules.AppModules) error {
	kmsService, err := service.NewKMSService(cfg)
	if err != nil {
		return err
	}
	m.Service = kmsService
	return nil
}

// GetName returns the name of the module.
func (m *Module) GetName() string {
	return ModuleName
}

// RegisterRoutes delegates route registration to the handler.
func (m *Module) RegisterRoutes(_ *http.ServeMux) {}

// OnApplicationStart Application starts.
func (m *Module) OnApplicationStart() error {
	return nil
}

// OnApplicationStop Application stops.
func (m *Module) OnApplicationStop() error {
	return nil
}
