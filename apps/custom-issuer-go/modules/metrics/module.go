package metrics

import (
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/modules"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var _ modules.AppModule = (*Module)(nil)

var ModuleName = "metrics"

// Module exposes a Prometheus /metrics endpoint.
type Module struct{}

// Init is a no-op for the metrics module.
func (m *Module) Init(_ *config.Config, _ *modules.AppModules) error { return nil }

// GetName returns the name of the module.
func (m *Module) GetName() string { return ModuleName }

// RegisterRoutes registers the /metrics Prometheus endpoint.
func (m *Module) RegisterRoutes(mux *http.ServeMux) {
	mux.Handle("GET /metrics", promhttp.Handler())
}

// OnApplicationStart is a no-op for the metrics module.
func (m *Module) OnApplicationStart() error { return nil }

// OnApplicationStop is a no-op for the metrics module.
func (m *Module) OnApplicationStop() error { return nil }
