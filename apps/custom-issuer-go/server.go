package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/middleware"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/kms"
)

// NewServer creates an HTTP server with all modules and middleware registered.
// Returns the server and a stop function for background cleanup (e.g. key refresh).
func NewServer(cfg *config.Config) (*http.Server, func(), error) {
	mux := http.NewServeMux()

	// Register modules
	kmsModule, err := kms.NewModule(cfg)
	if err != nil {
		return nil, nil, err
	}

	issuerModule, err := issuer.NewModule(cfg, kmsModule.Service)
	if err != nil {
		return nil, nil, err
	}
	issuerModule.RegisterRoutes(mux)

	// Apply middleware stack (innermost first)
	var h http.Handler = mux
	h = middleware.CORS(cfg.AllowedOrigins)(h)
	h = middleware.RecoveryMiddleware(h)

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           h,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1MB
	}

	return srv, issuerModule.Stop, nil
}
