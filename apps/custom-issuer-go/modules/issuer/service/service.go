package service

import (
	"context"
	"encoding/json"
	"fmt"

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
	if err := ks.LoadKeys(); err != nil {
		return nil, err
	}
	ks.StartRefresh()

	return &IssuerService{cfg: cfg, keyStore: ks, signer: signer}, nil
}

// tokenPayload mirrors the JWT payload structure from the NestJS custom-issuer.
// fatxn is []int so it serializes as a JSON array of numbers (not base64).
type tokenPayload struct {
	Sub   string `json:"sub"`
	Iss   string `json:"iss"`
	Fatxn []int  `json:"fatxn"`
	Exp   *int64 `json:"exp,omitempty"`
	Nbf   *int64 `json:"nbf,omitempty"`
}

// Issue verifies the incoming JWT and signs a new token from the payload.
func (s *IssuerService) Issue(ctx context.Context, jwtToken string, signPayload []byte) (*IssueResult, error) {
	publicKeys := s.keyStore.GetKeys()
	claims, err := verifyToken(jwtToken, publicKeys)
	if err != nil {
		return nil, &AuthError{Message: err.Error()}
	}

	verified, err := validateClaims(claims, s.cfg.ValidationIssuerURL, s.cfg.IgnoreExpiration)
	if err != nil {
		return nil, &AuthError{Message: err.Error()}
	}
	logger.Info("JWT validated successfully")

	token, err := s.createSignedToken(ctx, verified, signPayload)
	if err != nil {
		return nil, err
	}

	return &IssueResult{Token: token}, nil
}

// Stop stops background key refresh. Safe to call multiple times.
func (s *IssuerService) Stop() {
	s.keyStore.Stop()
}

// HasValidationKeys returns true if the service has loaded validation public keys.
func (s *IssuerService) HasValidationKeys() bool {
	return len(s.keyStore.GetKeys()) > 0
}

// createSignedToken builds the JWT claims and signs them via the Signer.
func (s *IssuerService) createSignedToken(ctx context.Context, verified *verifiedClaims, signPayload []byte) (string, error) {
	fatxn := make([]int, len(signPayload))
	for i, b := range signPayload {
		fatxn[i] = int(b)
	}

	payload := tokenPayload{
		Sub:   verified.Sub,
		Iss:   s.cfg.IssuerURL,
		Fatxn: fatxn,
		Exp:   verified.Exp,
		Nbf:   verified.Nbf,
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal token payload: %w", err)
	}

	token, err := s.signer.SignJWT(ctx, payloadJSON)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return token, nil
}
