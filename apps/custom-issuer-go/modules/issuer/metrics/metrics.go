package metrics

import (
	"errors"

	otelmetrics "github.com/peersyst/fast-auth/apps/custom-issuer/modules/metrics"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
)

var (
	TokensIssuedTotal           metric.Int64Counter
	TokensFailedTotal           metric.Int64Counter
	TokensValidationFailedTotal metric.Int64Counter
	IssueDurationSeconds        metric.Float64Histogram
)

func Init() error {
	if !otelmetrics.Initialized() {
		return errors.New("metrics module must be initialized before issuer metrics")
	}
	meter := otel.Meter("custom-issuer-go/issuer")

	var err error
	TokensIssuedTotal, err = meter.Int64Counter("custom_issuer_go_tokens_issued_total",
		metric.WithDescription("Total number of successfully issued tokens"))
	if err != nil {
		return err
	}
	TokensFailedTotal, err = meter.Int64Counter("custom_issuer_go_tokens_failed_total",
		metric.WithDescription("Total number of token issuance failures (auth/internal errors, excludes request validation)"))
	if err != nil {
		return err
	}
	TokensValidationFailedTotal, err = meter.Int64Counter("custom_issuer_go_tokens_validation_failed_total",
		metric.WithDescription("Total number of requests rejected due to validation errors"))
	if err != nil {
		return err
	}
	IssueDurationSeconds, err = meter.Float64Histogram("custom_issuer_go_issue_duration_seconds",
		metric.WithDescription("Duration of token issuance in seconds"),
		metric.WithUnit("s"),
		metric.WithExplicitBucketBoundaries(0.01, 0.025, 0.05, 0.075, 0.1, 0.15, 0.25, 0.5, 1))
	if err != nil {
		return err
	}
	return nil
}
