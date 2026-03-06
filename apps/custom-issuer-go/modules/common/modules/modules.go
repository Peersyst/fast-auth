package modules

import (
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

// Stop stops all modules.
func (m *AppModules) Stop() error {
	for _, module := range *m.modules {
		logger.Info("Stopping module", "module", module.GetName())
		err := module.OnApplicationStop()
		if err != nil {
			return err
		}
	}
	return nil
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
