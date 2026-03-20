package service

import (
	"context"
	"time"
)

type HealthCheckStatus string

const (
	StatusOK    HealthCheckStatus = "ok"
	StatusError HealthCheckStatus = "error"
)

type DependencyResult struct {
	Status  HealthCheckStatus `json:"status"`
	Message string            `json:"message,omitempty"`
}

type ReadyzResponse struct {
	Status HealthCheckStatus            `json:"status"`
	Checks map[string]DependencyResult  `json:"checks"`
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
func (s *HealthService) CheckHealth() ReadyzResponse {
	checks := map[string]DependencyResult{}

	if s.keyChecker.HasValidationKeys() {
		checks["validation-keys-go"] = DependencyResult{Status: StatusOK}
	} else {
		checks["validation-keys-go"] = DependencyResult{Status: StatusError, Message: "no validation keys loaded"}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := s.signProber.Ping(ctx); err != nil {
		checks["kms-sign-go"] = DependencyResult{Status: StatusError, Message: err.Error()}
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
