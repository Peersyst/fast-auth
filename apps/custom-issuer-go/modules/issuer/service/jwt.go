package service

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
	errInvalidToken     = errors.New("Invalid JWT token")
	errMissingSub       = errors.New("JWT missing required \"sub\" claim")
	errInvalidIssuer    = errors.New("JWT issuer does not match expected validation issuer")
	errInvalidExpType   = errors.New("JWT \"exp\" claim must be a valid integer")
	errTokenExpired     = errors.New("JWT token has expired")
	errInvalidNbfType   = errors.New("JWT \"nbf\" claim must be a valid integer")
	errTokenNotYetValid = errors.New("JWT token is not yet valid (nbf is in the future)")
	errExpBeforeNbf     = errors.New("JWT \"exp\" must be after \"nbf\"")
)

// verifiedClaims holds the validated claims from a Firebase JWT.
type verifiedClaims struct {
	Sub string
	Iss string
	Exp *int64
	Nbf *int64
}

// verifyToken verifies the JWT signature against the provided public keys using RS256.
func verifyToken(tokenStr string, publicKeys []*rsa.PublicKey) (map[string]any, error) {
	parts := strings.SplitN(tokenStr, ".", 3)
	if len(parts) != 3 {
		return nil, errInvalidToken
	}

	// Decode and check header
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, errInvalidToken
	}
	var header struct {
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, errInvalidToken
	}
	if header.Alg != "RS256" {
		return nil, errInvalidToken
	}

	// Verify signature against each public key
	signingInput := []byte(parts[0] + "." + parts[1])
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, errInvalidToken
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
		return nil, errInvalidToken
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errInvalidToken
	}

	var claims map[string]any
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, errInvalidToken
	}

	return claims, nil
}

// validateClaims validates the JWT claims and returns the verified claims.
func validateClaims(claims map[string]any, validationIssuer string, ignoreExpiration bool) (*verifiedClaims, error) {
	result := &verifiedClaims{}

	// sub: must exist, be string, non-empty
	subRaw, exists := claims["sub"]
	if !exists {
		return nil, errMissingSub
	}
	sub, ok := subRaw.(string)
	if !ok || sub == "" {
		return nil, errMissingSub
	}
	result.Sub = sub

	// iss: must exactly match validationIssuer
	issRaw, exists := claims["iss"]
	if !exists {
		return nil, errInvalidIssuer
	}
	iss, ok := issRaw.(string)
	if !ok || iss != validationIssuer {
		return nil, errInvalidIssuer
	}
	result.Iss = iss

	now := time.Now().Unix()

	// exp: optional for compatibility with the NestJS custom-issuer; must be integer if present
	if expRaw, exists := claims["exp"]; exists {
		expFloat, ok := expRaw.(float64)
		if !ok || expFloat != math.Trunc(expFloat) {
			return nil, errInvalidExpType
		}
		exp := int64(expFloat)
		result.Exp = &exp

		if !ignoreExpiration && exp <= now {
			return nil, errTokenExpired
		}
	}

	// nbf: optional for compatibility with the NestJS custom-issuer; must be integer if present
	if nbfRaw, exists := claims["nbf"]; exists {
		nbfFloat, ok := nbfRaw.(float64)
		if !ok || nbfFloat != math.Trunc(nbfFloat) {
			return nil, errInvalidNbfType
		}
		nbf := int64(nbfFloat)
		result.Nbf = &nbf

		if !ignoreExpiration && nbf > now {
			return nil, errTokenNotYetValid
		}
	}

	// exp vs nbf: if both present, exp > nbf
	if result.Exp != nil && result.Nbf != nil && !ignoreExpiration {
		if *result.Exp <= *result.Nbf {
			return nil, errExpBeforeNbf
		}
	}

	return result, nil
}
