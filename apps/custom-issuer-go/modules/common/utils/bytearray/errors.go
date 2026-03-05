package bytearray

import "errors"

var (
	ErrNotArray   = errors.New("not a JSON array")
	ErrEmpty      = errors.New("array is empty")
	ErrNotInteger = errors.New("value is not an integer")
	ErrTooHigh    = errors.New("value exceeds maximum")
	ErrTooLow     = errors.New("value below minimum")
)
