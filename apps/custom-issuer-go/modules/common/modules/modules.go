package modules

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
)

type AppModules struct {
	modules *[]AppModule
}

// NewAppModules initializes and inits all modules.
func NewAppModules(cfg *config.Config, modules *[]AppModule) (*AppModules, error) {
	appModules := AppModules{modules: modules}
	for _, module := range *modules {
		logger.Info("Initializing module", "module", module.GetName())
		err := module.Init(cfg, &appModules)
		if err != nil {
			return nil, err
		}
	}
	return &appModules, nil
}

// Start starts all modules.
func (m *AppModules) Start() error {
	for _, module := range *m.modules {
		logger.Info("Starting module", "module", module.GetName())
		err := module.OnApplicationStart()
		if err != nil {
			return err
		}
	}
	return nil
}

// Stop stops all modules in reverse init order. All modules are stopped even
// if some return errors.
func (m *AppModules) Stop() error {
	var errs []error
	for i := len(*m.modules) - 1; i >= 0; i-- {
		module := (*m.modules)[i]
		logger.Info("Stopping module", "module", module.GetName())
		if err := module.OnApplicationStop(); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// GetModules returns all modules.
func (m *AppModules) GetModules() *[]AppModule {
	return m.modules
}

// RegisterRoutes registers all modules' routes.'
func (m *AppModules) RegisterRoutes(mux *http.ServeMux) {
	for _, module := range *m.modules {
		module.RegisterRoutes(mux)
	}
}

// GetModule returns a module by name.
func (m *AppModules) GetModule(name string) (AppModule, error) {
	for _, module := range *m.modules {
		if module.GetName() == name {
			return module, nil
		}
	}
	return nil, fmt.Errorf("module not found: %s", name)
}
