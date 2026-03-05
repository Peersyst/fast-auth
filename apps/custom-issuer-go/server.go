package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/middleware"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer"
)

// NewServer creates an HTTP server with all modules and middleware registered.
func NewServer(cfg *config.Config) *http.Server {
	mux := http.NewServeMux()

	// Register modules
	issuerModule := issuer.NewModule()
	issuerModule.RegisterRoutes(mux)

	// Apply middleware stack (innermost first)
	var h http.Handler = mux
	h = middleware.CORS(cfg.AllowedOrigins)(h)
	h = middleware.RecoveryMiddleware(h)

	return &http.Server{
		Addr:           fmt.Sprintf(":%d", cfg.Port),
		Handler:        h,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}
}
