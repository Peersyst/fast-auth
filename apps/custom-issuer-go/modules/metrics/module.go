package metrics

import (
	"context"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/modules"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/prometheus"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
)

var _ modules.AppModule = (*Module)(nil)

var ModuleName = "metrics"

var initialized atomic.Bool

// Initialized reports whether the OTel MeterProvider has been set up.
func Initialized() bool { return initialized.Load() }

// Module sets up the OpenTelemetry MeterProvider and exposes a Prometheus /metrics endpoint.
type Module struct {
	provider *sdkmetric.MeterProvider
}

// Init initializes the OTel MeterProvider with a Prometheus exporter.
func (m *Module) Init(cfg *config.Config, _ *modules.AppModules) error {
	exporter, err := prometheus.New(
		prometheus.WithResourceAsConstantLabels(attribute.NewAllowKeysFilter("app", "environment", "service.name")),
	)
	if err != nil {
		return err
	}
	res, err := resource.Merge(
		resource.Default(),
		resource.NewSchemaless(
			attribute.String("app", cfg.AppName),
			attribute.String("environment", cfg.Environment),
			attribute.String("service.name", cfg.AppName),
		),
	)
	if err != nil {
		return err
	}
	provider := sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(exporter),
		sdkmetric.WithResource(res),
	)
	otel.SetMeterProvider(provider)
	initialized.Store(true)

	m.provider = provider
	return nil
}

// GetName returns the name of the module.
func (m *Module) GetName() string { return ModuleName }

// RegisterRoutes registers the /metrics Prometheus endpoint.
func (m *Module) RegisterRoutes(mux *http.ServeMux) {
	mux.Handle("GET /metrics", promhttp.Handler())
}

// OnApplicationStart is a no-op for the metrics module.
func (m *Module) OnApplicationStart() error { return nil }

// OnApplicationStop shuts down the OTel MeterProvider.
func (m *Module) OnApplicationStop() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return m.provider.Shutdown(ctx)
}
