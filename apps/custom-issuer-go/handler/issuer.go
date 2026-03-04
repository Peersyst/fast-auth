package handler

import (
	"encoding/json"
	"net/http"
)

const maxBodySize = 10 * 1024 // 10KB

// Error messages start with uppercase to preserve API compatibility with the
// previous NestJS custom-issuer service. This intentionally deviates from Go conventions.
const (
	errInvalidRequestBody = "Invalid request body"
	errJWTEmpty           = "jwt must be a non-empty string"
	errJWTTooLong         = "jwt must be shorter than or equal to 10000 characters"
	errSignPayloadMissing = "signPayload is required"
)

func (h *IssuerHandler) handleIssue(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)

	var req issueRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		h.sendError(w, r, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate jwt field
	if req.JWT == "" {
		h.sendError(w, r, http.StatusBadRequest, errJWTEmpty)
		return
	}
	if len(req.JWT) > 10000 {
		h.sendError(w, r, http.StatusBadRequest, errJWTTooLong)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(issueResponse{Token: "placeholder"})
}
