package middleware

import (
	"net/http"
	"strings"
)

// CORS returns a middleware that handles Cross-Origin Resource Sharing.
// If allowedOrigins is empty, all origins are allowed.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			originAllowed := false

			if origin != "" {
				if len(allowedOrigins) == 0 {
					w.Header().Set("Access-Control-Allow-Origin", "*")
					originAllowed = true
				} else {
					for _, allowed := range allowedOrigins {
						if strings.EqualFold(origin, allowed) {
							w.Header().Set("Access-Control-Allow-Origin", origin)
							w.Header().Set("Vary", "Origin")
							originAllowed = true
							break
						}
					}
					if !originAllowed {
						http.Error(w, "Forbidden", http.StatusForbidden)
						return
					}
				}
			}

			if originAllowed {
				w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, PUT, PATCH, POST, DELETE")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
