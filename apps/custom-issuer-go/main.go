package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/common/modules"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/health"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/issuer"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/kms"
	"github.com/peersyst/fast-auth/apps/custom-issuer/modules/metrics"
)

func main() {
	config.LoadEnv(".env")
	logger.Init()

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Register modules
	mods := []modules.AppModule{&kms.Module{}, &issuer.Module{}, &health.Module{}, &metrics.Module{}}
	appModules, err := modules.NewAppModules(cfg, &mods)
	if err != nil {
		panic(err)
	}

	server := NewServer(cfg, appModules)

	if err := appModules.Start(); err != nil {
		logger.Error("failed to start modules", "error", err)
		os.Exit(1)
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		logger.Info("stopping app modules...")
		if err := appModules.Stop(); err != nil {
			logger.Error("failed to stop modules", "error", err)
		}

		logger.Info("shutting down server...")
		if err := server.Stop(); err != nil {
			logger.Error("server shutdown error", "error", err)
		}

	}()

	logger.Info("server starting", "port", cfg.Port)
	if err := server.Start(); err != nil {
		logger.Error("start server error", "error", err)
		os.Exit(1)
	}

	logger.Info("server stopped")
}
