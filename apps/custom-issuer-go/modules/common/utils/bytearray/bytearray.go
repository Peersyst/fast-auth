package bytearray

import "encoding/json"

// Array is a []byte that unmarshals from a JSON array of integers (0-255).
type Array []byte

func (b *Array) UnmarshalJSON(data []byte) error {
	var raw []float64
	if err := json.Unmarshal(data, &raw); err != nil {
		return ErrNotArray
	}
	if len(raw) == 0 {
		return ErrEmpty
	}
	result := make([]byte, len(raw))
	for i, v := range raw {
		if v != float64(int(v)) {
			return ErrNotInteger
		}
		if v > 255 {
			return ErrTooHigh
		}
		if v < 0 {
			return ErrTooLow
		}
		result[i] = byte(v)
	}
	*b = result
	return nil
}
