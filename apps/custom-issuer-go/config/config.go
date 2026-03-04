package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                   int
	ValidationPublicKeyURL string
	ValidationIssuerURL    string
	IssuerURL              string
	AllowedOrigins         []string
}

func Load() (*Config, error) {
	cfg := &Config{}

	// PORT (optional, default 3000)
	portStr := os.Getenv("PORT")
	if portStr == "" {
		cfg.Port = 3000
	} else {
		p, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %s", portStr)
		}
		cfg.Port = p
	}

	// Required vars
	cfg.ValidationPublicKeyURL = os.Getenv("VALIDATION_PUBLIC_KEY_URL")
	if cfg.ValidationPublicKeyURL == "" {
		return nil, fmt.Errorf("missing required environment variable: VALIDATION_PUBLIC_KEY_URL")
	}

	cfg.ValidationIssuerURL = os.Getenv("VALIDATION_ISSUER_URL")
	if cfg.ValidationIssuerURL == "" {
		return nil, fmt.Errorf("missing required environment variable: VALIDATION_ISSUER_URL")
	}

	cfg.IssuerURL = os.Getenv("ISSUER_URL")
	if cfg.IssuerURL == "" {
		return nil, fmt.Errorf("missing required environment variable: ISSUER_URL")
	}

	// ALLOWED_ORIGINS (optional, comma-separated)
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins != "" {
		for _, o := range strings.Split(origins, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				cfg.AllowedOrigins = append(cfg.AllowedOrigins, o)
			}
		}
	}

	return cfg, nil
}
