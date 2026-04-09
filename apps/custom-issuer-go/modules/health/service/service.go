package service

import (
	"context"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
)

type HealthCheckStatus string

const (
	StatusOK    HealthCheckStatus = "ok"
	StatusError HealthCheckStatus = "error"

	validationKeysUnavailableMessage = "validation keys unavailable"
	signingUnavailableMessage        = "signing dependency unavailable"
)

type DependencyResult struct {
	Status  HealthCheckStatus `json:"status"`
	Message string            `json:"message,omitempty"`
}

type ReadyzResponse struct {
	Status HealthCheckStatus           `json:"status"`
	Checks map[string]DependencyResult `json:"checks"`
}

// ValidationKeyChecker checks whether validation keys are loaded.
type ValidationKeyChecker interface {
	HasValidationKeys() bool
}

// SignProber verifies signing capability via a test signature.
type SignProber interface {
	Ping(ctx context.Context) error
}

// HealthService checks the health of application dependencies.
type HealthService struct {
	keyChecker ValidationKeyChecker
	signProber SignProber
}

// NewHealthService creates a new HealthService.
func NewHealthService(keyChecker ValidationKeyChecker, signProber SignProber) *HealthService {
	return &HealthService{keyChecker: keyChecker, signProber: signProber}
}

// CheckHealth runs all dependency checks and returns an aggregated result.
func (s *HealthService) CheckHealth(ctx context.Context) ReadyzResponse {
	checks := map[string]DependencyResult{}

	if s.keyChecker.HasValidationKeys() {
		checks["validation-keys-go"] = DependencyResult{Status: StatusOK}
	} else {
		checks["validation-keys-go"] = DependencyResult{Status: StatusError, Message: validationKeysUnavailableMessage}
	}

	probeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := s.signProber.Ping(probeCtx); err != nil {
		logger.Error("health check failed",
			"dependency", "kms-sign-go",
			"error", err,
		)
		checks["kms-sign-go"] = DependencyResult{Status: StatusError, Message: signingUnavailableMessage}
	} else {
		checks["kms-sign-go"] = DependencyResult{Status: StatusOK}
	}

	status := StatusOK
	for _, check := range checks {
		if check.Status != StatusOK {
			status = StatusError
			break
		}
	}

	return ReadyzResponse{Status: status, Checks: checks}
}
