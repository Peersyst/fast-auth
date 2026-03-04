package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer-go/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer-go/handler"
	"github.com/peersyst/fast-auth/apps/custom-issuer-go/keys"
	"github.com/peersyst/fast-auth/apps/custom-issuer-go/logger"
)

func main() {
	config.LoadEnv(".env")
	logger.Init()

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Fetch Firebase public keys and start background rotation
	keyStore := keys.NewFirebaseKeyStore(cfg.ValidationPublicKeyURL)
	ttl, err := keyStore.LoadKeys()
	if err != nil {
		logger.Error("failed to fetch Firebase public keys", "error", err)
		os.Exit(1)
	}
	keyStore.StartRefresh(ttl)
	defer keyStore.Stop()

	// Setup HTTP routes
	mux := http.NewServeMux()
	issuerHandler := handler.NewIssuerHandler(cfg, keyStore)
	issuerHandler.RegisterRoutes(mux)

	srv := &http.Server{
		Addr:           fmt.Sprintf(":%d", cfg.Port),
		Handler:        handler.RecoveryMiddleware(mux),
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		logger.Info("shutting down server...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Error("server shutdown error", "error", err)
		}
	}()

	logger.Info("server starting", "port", cfg.Port)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}

	logger.Info("server stopped")
}
