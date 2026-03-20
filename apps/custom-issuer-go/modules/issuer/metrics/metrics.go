package metrics

import "github.com/prometheus/client_golang/prometheus"

// Prometheus metrics for the issuer module.
var (
	TokensIssuedTotal = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "custom_issuer_go_tokens_issued_total",
		Help: "Total number of successfully issued tokens",
	})
	TokensFailedTotal = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "custom_issuer_go_tokens_failed_total",
		Help: "Total number of failed token issuance attempts",
	})
	IssueDurationSeconds = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name: "custom_issuer_go_issue_duration_seconds",
		Help: "Duration of token issuance in seconds",
	})
)

func init() {
	prometheus.MustRegister(TokensIssuedTotal, TokensFailedTotal, IssueDurationSeconds)
}
