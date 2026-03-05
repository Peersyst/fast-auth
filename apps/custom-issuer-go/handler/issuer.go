package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	authjwt "github.com/peersyst/fast-auth/apps/custom-issuer-go/jwt"
	"github.com/peersyst/fast-auth/apps/custom-issuer-go/logger"
)

// MaxJWTLength is the maximum allowed length for incoming JWT strings.
const MaxJWTLength = 10000

// Error messages start with uppercase to preserve API compatibility with the
// previous NestJS custom-issuer service. This intentionally deviates from Go conventions.
const (
	errInvalidRequestBody = "Invalid request body"
	errJWTEmpty           = "jwt must be a non-empty string"
	errSignPayloadMissing = "signPayload is required"
)

var errJWTTooLong = fmt.Sprintf("jwt must be shorter than or equal to %d characters", MaxJWTLength)

func (h *IssuerHandler) handleIssue(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)

	var req issueRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		h.sendError(w, r, http.StatusBadRequest, errInvalidRequestBody)
		return
	}
	// Reject trailing data after the first JSON object.
	var extra json.RawMessage
	if err := decoder.Decode(&extra); err != io.EOF {
		h.sendError(w, r, http.StatusBadRequest, errInvalidRequestBody)
		return
	}

	// Validate jwt field
	if req.JWT == "" {
		h.sendError(w, r, http.StatusBadRequest, errJWTEmpty)
		return
	}
	if len(req.JWT) > MaxJWTLength {
		h.sendError(w, r, http.StatusBadRequest, errJWTTooLong)
		return
	}

	// Validate signPayload
	if req.SignPayload == nil {
		h.sendError(w, r, http.StatusBadRequest, errSignPayloadMissing)
		return
	}

	// Verify JWT signature against Firebase public keys
	publicKeys := h.keyStore.GetKeys()
	claims, err := authjwt.VerifyToken(req.JWT, publicKeys)
	if err != nil {
		h.sendError(w, r, http.StatusUnauthorized, err.Error())
		return
	}

	// Validate claims
	_, err = authjwt.ValidateClaims(claims, h.cfg.ValidationIssuerURL, h.cfg.IgnoreExpiration)
	if err != nil {
		h.sendError(w, r, http.StatusUnauthorized, err.Error())
		return
	}
	logger.Info("JWT validated successfully")

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(issueResponse{Token: "placeholder"})
}
