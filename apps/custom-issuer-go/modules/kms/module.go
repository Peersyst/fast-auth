package kms

import (
	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/kms/service"
)

// Module wires together the KMS service.
type Module struct {
	Service *service.KMSService
}

// NewModule creates a new KMS Module and verifies KMS connectivity.
func NewModule(cfg *config.Config) (*Module, error) {
	svc, err := service.NewKMSService(cfg)
	if err != nil {
		return nil, err
	}

	return &Module{Service: svc}, nil
}
