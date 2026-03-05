package jwt

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math"
	"strings"
	"time"
)

// Error messages start with uppercase to preserve API compatibility with the
// previous NestJS custom-issuer service. This intentionally deviates from Go conventions.
var (
	ErrInvalidToken     = errors.New("Invalid JWT token")
	ErrMissingSub       = errors.New("JWT missing required \"sub\" claim")
	ErrInvalidIssuer    = errors.New("JWT issuer does not match expected validation issuer")
	ErrInvalidExpType   = errors.New("JWT \"exp\" claim must be a valid integer")
	ErrTokenExpired     = errors.New("JWT token has expired")
	ErrInvalidNbfType   = errors.New("JWT \"nbf\" claim must be a valid integer")
	ErrTokenNotYetValid = errors.New("JWT token is not yet valid (nbf is in the future)")
	ErrExpBeforeNbf     = errors.New("JWT \"exp\" must be after \"nbf\"")
)

// VerifiedClaims holds the validated claims from a Firebase JWT.
type VerifiedClaims struct {
	Sub string
	Iss string
	Exp *int64
	Nbf *int64
}

// VerifyToken verifies the JWT signature against the provided public keys using RS256.
func VerifyToken(tokenStr string, publicKeys []*rsa.PublicKey) (map[string]any, error) {
	parts := strings.SplitN(tokenStr, ".", 3)
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	// Decode and check header
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrInvalidToken
	}
	var header struct {
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, ErrInvalidToken
	}
	if header.Alg != "RS256" {
		return nil, ErrInvalidToken
	}

	// Verify signature against each public key
	signingInput := []byte(parts[0] + "." + parts[1])
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, ErrInvalidToken
	}

	hash := sha256.Sum256(signingInput)
	verified := false
	for _, key := range publicKeys {
		if rsa.VerifyPKCS1v15(key, crypto.SHA256, hash[:], signature) == nil {
			verified = true
			break
		}
	}
	if !verified {
		return nil, ErrInvalidToken
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrInvalidToken
	}

	var claims map[string]any
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateClaims validates the JWT claims and returns the verified claims.
func ValidateClaims(claims map[string]any, validationIssuer string, ignoreExpiration bool) (*VerifiedClaims, error) {
	result := &VerifiedClaims{}

	// sub: must exist, be string, non-empty
	subRaw, exists := claims["sub"]
	if !exists {
		return nil, ErrMissingSub
	}
	sub, ok := subRaw.(string)
	if !ok || sub == "" {
		return nil, ErrMissingSub
	}
	result.Sub = sub

	// iss: must exactly match validationIssuer
	issRaw, exists := claims["iss"]
	if !exists {
		return nil, ErrInvalidIssuer
	}
	iss, ok := issRaw.(string)
	if !ok || iss != validationIssuer {
		return nil, ErrInvalidIssuer
	}
	result.Iss = iss

	now := time.Now().Unix()

	// exp: optional for compatibility with the NestJS custom-issuer; must be integer if present
	if expRaw, exists := claims["exp"]; exists {
		expFloat, ok := expRaw.(float64)
		if !ok || expFloat != math.Trunc(expFloat) {
			return nil, ErrInvalidExpType
		}
		exp := int64(expFloat)
		result.Exp = &exp

		if !ignoreExpiration && exp <= now {
			return nil, ErrTokenExpired
		}
	}

	// nbf: optional for compatibility with the NestJS custom-issuer; must be integer if present
	if nbfRaw, exists := claims["nbf"]; exists {
		nbfFloat, ok := nbfRaw.(float64)
		if !ok || nbfFloat != math.Trunc(nbfFloat) {
			return nil, ErrInvalidNbfType
		}
		nbf := int64(nbfFloat)
		result.Nbf = &nbf

		if !ignoreExpiration && nbf > now {
			return nil, ErrTokenNotYetValid
		}
	}

	// exp vs nbf: if both present, exp > nbf
	if result.Exp != nil && result.Nbf != nil && !ignoreExpiration {
		if *result.Exp <= *result.Nbf {
			return nil, ErrExpBeforeNbf
		}
	}

	return result, nil
}
