package config

import (
	"bufio"
	"fmt"
	"net/url"
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
	IgnoreExpiration       bool
}

// LoadEnv reads a .env file into the environment.
func LoadEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer func(f *os.File) {
		_ = f.Close()
	}(f)

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		// Don't override existing env vars
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, val)
		}
	}
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

	// VALIDATION_PUBLIC_KEY_URL (required, must be valid URL)
	cfg.ValidationPublicKeyURL = os.Getenv("VALIDATION_PUBLIC_KEY_URL")
	if cfg.ValidationPublicKeyURL == "" {
		return nil, fmt.Errorf("missing required environment variable: VALIDATION_PUBLIC_KEY_URL")
	}
	u, err := url.Parse(cfg.ValidationPublicKeyURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("VALIDATION_PUBLIC_KEY_URL is not a valid URL")
	}

	// VALIDATION_ISSUER_URL (required)
	cfg.ValidationIssuerURL = os.Getenv("VALIDATION_ISSUER_URL")
	if cfg.ValidationIssuerURL == "" {
		return nil, fmt.Errorf("missing required environment variable: VALIDATION_ISSUER_URL")
	}

	// ISSUER_URL (required)
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

	// IGNORE_EXPIRATION (optional, default false)
	if strings.EqualFold(os.Getenv("IGNORE_EXPIRATION"), "true") {
		cfg.IgnoreExpiration = true
	}

	return cfg, nil
}
