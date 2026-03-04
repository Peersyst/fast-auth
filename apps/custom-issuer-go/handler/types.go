package handler

import (
	"encoding/json"
	"errors"
)

// Error messages start with uppercase to preserve API compatibility with the
// previous NestJS custom-issuer service. This intentionally deviates from Go conventions.
var (
	ErrInvalidSignPayloadType   = errors.New("Invalid sign payload type")
	ErrInvalidSignPayloadValues = errors.New("Invalid sign payload values")
)

// ByteArray is a []byte that unmarshals from a JSON array of integers (0-255).
type ByteArray []byte

func (b *ByteArray) UnmarshalJSON(data []byte) error {
	var raw []float64
	if err := json.Unmarshal(data, &raw); err != nil {
		return ErrInvalidSignPayloadType
	}
	if len(raw) == 0 {
		return ErrInvalidSignPayloadValues
	}
	result := make([]byte, len(raw))
	for i, v := range raw {
		if v != float64(int(v)) || v < 0 || v > 255 {
			return ErrInvalidSignPayloadValues
		}
		result[i] = byte(v)
	}
	*b = result
	return nil
}

type issueRequest struct {
	JWT         string    `json:"jwt"`
	SignPayload ByteArray `json:"signPayload"`
}

type issueResponse struct {
	Token string `json:"token"`
}

type errorResponse struct {
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message"`
	Timestamp  string `json:"timestamp"`
	Path       string `json:"path"`
}
