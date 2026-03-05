package handler

import (
	"errors"
	"strings"

	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/utils/bytearray"
)

// Error messages match NestJS class-validator defaults to preserve API compatibility
// with the previous NestJS custom-issuer service.
const (
	errInvalidRequestBody = "Invalid request body"
	errJWTEmpty           = "jwt should not be empty"
	errJWTTooLong         = "JWT token is too long"
	errSignPayloadEmpty   = "signPayload should not be empty"
	errSignPayloadType    = "each value in signPayload must be a number conforming to the specified constraints"
	errSignPayloadTooHigh = "each value in signPayload must not be greater than 255"
	errSignPayloadTooLow  = "each value in signPayload must not be less than 0"
)

// mapDecodeError translates JSON decode errors into NestJS-compatible messages.
func mapDecodeError(err error) string {
	switch {
	case errors.Is(err, bytearray.ErrNotArray):
		return errSignPayloadType
	case errors.Is(err, bytearray.ErrEmpty):
		return errSignPayloadEmpty
	case errors.Is(err, bytearray.ErrNotInteger):
		return errSignPayloadType
	case errors.Is(err, bytearray.ErrTooHigh):
		return errSignPayloadTooHigh
	case errors.Is(err, bytearray.ErrTooLow):
		return errSignPayloadTooLow
	default:
		msg := err.Error()
		if strings.HasPrefix(msg, "json: unknown field ") {
			field := strings.TrimPrefix(msg, "json: unknown field ")
			field = strings.Trim(field, "\"")
			return "property " + field + " should not exist"
		}
		return errInvalidRequestBody
	}
}
