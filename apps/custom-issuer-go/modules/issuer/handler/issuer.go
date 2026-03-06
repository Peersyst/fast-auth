package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	commonhandler "github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/handler"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/middleware"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/utils/bytearray"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer/service"
)

// MaxJWTLength is the maximum allowed length for incoming JWT strings.
const MaxJWTLength = 10000

type issueRequest struct {
	JWT         string          `json:"jwt"`
	SignPayload bytearray.Array `json:"signPayload"`
}

type issueResponse struct {
	Token string `json:"token"`
}

func (h *IssuerHandler) handleIssue(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, middleware.MaxBodySize)

	var req issueRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		commonhandler.SendValidationErrors(w, r, []string{mapDecodeError(err)})
		return
	}
	// Reject trailing data after the first JSON object.
	var extra json.RawMessage
	if err := decoder.Decode(&extra); err != io.EOF {
		commonhandler.SendValidationErrors(w, r, []string{errInvalidRequestBody})
		return
	}

	// Validate jwt field
	if req.JWT == "" {
		commonhandler.SendValidationErrors(w, r, []string{errJWTEmpty})
		return
	}
	if len(req.JWT) > MaxJWTLength {
		commonhandler.SendValidationErrors(w, r, []string{errJWTTooLong})
		return
	}

	// Validate signPayload
	if req.SignPayload == nil {
		commonhandler.SendValidationErrors(w, r, []string{errSignPayloadEmpty})
		return
	}

	result, err := h.service.Issue(r.Context(), req.JWT, req.SignPayload)
	if err != nil {
		var authErr *service.AuthError
		if errors.As(err, &authErr) {
			commonhandler.SendError(w, r, http.StatusUnauthorized, authErr.Message)
			return
		}
		commonhandler.SendError(w, r, http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError))
		return
	}

	commonhandler.SendJSON(w, http.StatusOK, issueResponse{Token: result.Token})
}
