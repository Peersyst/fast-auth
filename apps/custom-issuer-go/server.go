package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/middleware"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/modules"
	"github.com/rs/cors"
)

type Server struct {
	http *http.Server
}

// NewServer creates an HTTP server with all modules and middleware registered.
// Returns the server and a stop function for background cleanup (e.g. key refresh).
func NewServer(cfg *config.Config, appModules *modules.AppModules) *Server {
	mux := http.NewServeMux()

	appModules.RegisterRoutes(mux)

	c := cors.New(cors.Options{
		AllowedOrigins: cfg.AllowedOrigins,
	})
	h := c.Handler(mux)
	// Recovery must be the outermost middleware so it catches panics from all inner layers, including CORS.
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

	return &Server{
		http: srv,
	}
}

func (s *Server) Start() error {
	err := s.http.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

func (s *Server) Stop() error {
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := s.http.Shutdown(shutdownCtx); err != nil {
		return err
	}
	return nil
}
