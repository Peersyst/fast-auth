package config

import (
	"bufio"
	"fmt"
	"log"
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
		if !os.IsNotExist(err) {
			log.Printf("error opening env file %s: %v", path, err)
		}
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
		if len(val) >= 2 {
			first, last := val[0], val[len(val)-1]
			if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
				val = val[1 : len(val)-1]
			}
		}
		// Don't override existing env vars
		if _, exists := os.LookupEnv(key); !exists {
			if err := os.Setenv(key, val); err != nil {
				log.Printf("error setting env var %s: %v", key, err)
			}
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("error reading env file %s: %v", path, err)
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
		if p < 1 || p > 65535 {
			return nil, fmt.Errorf("PORT out of range (1-65535): %d", p)
		}
		cfg.Port = p
	}

	// Required URL fields (must be valid http/https)
	var err error
	if cfg.ValidationPublicKeyURL, err = requireHTTPURL("VALIDATION_PUBLIC_KEY_URL"); err != nil {
		return nil, err
	}
	if cfg.ValidationIssuerURL, err = requireHTTPURL("VALIDATION_ISSUER_URL"); err != nil {
		return nil, err
	}
	if cfg.IssuerURL, err = requireHTTPURL("ISSUER_URL"); err != nil {
		return nil, err
	}

	// ALLOWED_ORIGINS (optional, comma-separated, deduplicated)
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins != "" {
		seen := make(map[string]struct{})
		for _, o := range strings.Split(origins, ",") {
			o = strings.TrimSpace(o)
			if o == "" {
				continue
			}
			if _, exists := seen[o]; exists {
				continue
			}
			seen[o] = struct{}{}
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, o)
		}
	}

	// IGNORE_EXPIRATION (optional, default false)
	if v := os.Getenv("IGNORE_EXPIRATION"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			return nil, fmt.Errorf("invalid IGNORE_EXPIRATION value %q: must be a boolean", v)
		}
		cfg.IgnoreExpiration = b
	}

	return cfg, nil
}

func requireHTTPURL(name string) (string, error) {
	val := os.Getenv(name)
	if val == "" {
		return "", fmt.Errorf("missing required environment variable: %s", name)
	}
	u, err := url.Parse(val)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("%s must be an http(s) URL", name)
	}
	return val, nil
}
