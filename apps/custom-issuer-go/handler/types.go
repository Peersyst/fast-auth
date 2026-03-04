package handler

import (
	"encoding/json"
	"fmt"
)

// ByteArray is a []byte that unmarshals from a JSON array of integers (0-255).
type ByteArray []byte

func (b *ByteArray) UnmarshalJSON(data []byte) error {
	var raw []float64
	if err := json.Unmarshal(data, &raw); err != nil {
		return fmt.Errorf("signPayload must be an array of numbers")
	}
	if len(raw) == 0 {
		return fmt.Errorf("signPayload must not be empty")
	}
	result := make([]byte, len(raw))
	for i, v := range raw {
		if v != float64(int(v)) || v < 0 || v > 255 {
			return fmt.Errorf("signPayload values must be integers between 0 and 255")
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
