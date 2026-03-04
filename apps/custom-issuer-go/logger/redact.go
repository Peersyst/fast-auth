package logger

import (
	"net/http"
	"strings"
)

var sensitiveFields = map[string]struct{}{
	"jwt":           {},
	"token":         {},
	"password":      {},
	"secret":        {},
	"authorization": {},
	"cookie":        {},
	"apikey":        {},
	"x-api-key":     {},
	"accesstoken":   {},
	"refreshtoken":  {},
}

const (
	redacted       = "[REDACTED]"
	maxRedactDepth = 5
)

func isSensitive(key string) bool {
	_, ok := sensitiveFields[strings.ToLower(key)]
	return ok
}

// RedactMap recursively replaces sensitive field values with "[REDACTED]".
func RedactMap(m map[string]any, depth int) map[string]any {
	if m == nil || depth > maxRedactDepth {
		return m
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		if isSensitive(k) {
			out[k] = redacted
			continue
		}
		if nested, ok := v.(map[string]any); ok {
			out[k] = RedactMap(nested, depth+1)
		} else {
			out[k] = v
		}
	}
	return out
}

// RedactHeaders redacts sensitive HTTP header values.
func RedactHeaders(h http.Header) map[string]string {
	out := make(map[string]string, len(h))
	for name, values := range h {
		if isSensitive(name) {
			out[name] = redacted
		} else {
			out[name] = strings.Join(values, ", ")
		}
	}
	return out
}
