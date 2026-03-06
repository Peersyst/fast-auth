package modules

import (
	"net/http"

	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
)

type AppModule interface {
	RegisterRoutes(mux *http.ServeMux)
	GetName() string
	Init(cfg *config.Config, modules *AppModules) error
	OnApplicationStop() error
	OnApplicationStart() error
}
