package service

import (
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

// IssuerService handles JWT verification and signing.
type IssuerService struct {
	cfg      *config.Config
	keyStore *firebaseKeyStore
}

// NewIssuerService creates a new IssuerService. It fetches Firebase public keys
// and starts background rotation.
func NewIssuerService(cfg *config.Config) (*IssuerService, error) {
	ks := newFirebaseKeyStore(cfg.ValidationPublicKeyURL)
	if err := ks.LoadKeys(); err != nil {
		return nil, err
	}
	ks.StartRefresh()

	return &IssuerService{cfg: cfg, keyStore: ks}, nil
}

// Issue verifies the incoming JWT and signs a new token from the payload.
func (s *IssuerService) Issue(jwtToken string, signPayload []byte) (*IssueResult, error) {
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
