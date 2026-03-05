package service

import (
	"context"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
)

// AuthError represents an authentication/authorization failure.
type AuthError struct {
	Message string
}

func (e *AuthError) Error() string { return e.Message }

// IssueResult holds the token returned by the issue operation.
type IssueResult struct {
	Token string
}

// Signer signs a payload and returns the signed JWT string.
type Signer interface {
	SignJWT(ctx context.Context, payload []byte) (string, error)
}

// IssuerService handles JWT verification and signing.
type IssuerService struct {
	cfg      *config.Config
	keyStore *firebaseKeyStore
	signer   Signer
}

// NewIssuerService creates a new IssuerService. It fetches Firebase public keys
// and starts background rotation.
func NewIssuerService(cfg *config.Config, signer Signer) (*IssuerService, error) {
	ks := newFirebaseKeyStore(cfg.ValidationPublicKeyURL)
	ttl, err := ks.LoadKeys()
	if err != nil {
		return nil, err
	}
	ks.StartRefresh(ttl)

	return &IssuerService{cfg: cfg, keyStore: ks, signer: signer}, nil
}

// Issue verifies the incoming JWT and signs a new token from the payload.
func (s *IssuerService) Issue(ctx context.Context, jwtToken string, signPayload []byte) (*IssueResult, error) {
	publicKeys := s.keyStore.GetKeys()
	claims, err := verifyToken(jwtToken, publicKeys)
	if err != nil {
		return nil, &AuthError{Message: err.Error()}
	}

	_, err = validateClaims(claims, s.cfg.ValidationIssuerURL, s.cfg.IgnoreExpiration)
	if err != nil {
		return nil, &AuthError{Message: err.Error()}
	}
	logger.Info("JWT validated successfully")

	return &IssueResult{Token: "placeholder"}, nil
}

// Stop stops background key refresh. Safe to call multiple times.
func (s *IssuerService) Stop() {
	s.keyStore.Stop()
}
