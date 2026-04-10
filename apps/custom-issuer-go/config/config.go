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
	AppName                string
	Environment            string
	Port                   int
	ValidationPublicKeyURL string
	ValidationIssuerURL    string
	IssuerURL              string
	AllowedOrigins         []string
	IgnoreExpiration       bool
	AWSRegion              string
	KMSKeyID               string
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
	cfg := &Config{
		AppName:     parseStringEnv("APP_NAME", "custom-issuer-go"),
		Environment: parseStringEnv("CONFIG_ENV", "development"),
	}
	var err error

	if cfg.Port, err = parsePort(); err != nil {
		return nil, err
	}
	if cfg.ValidationPublicKeyURL, err = parseHTTPURL("VALIDATION_PUBLIC_KEY_URL"); err != nil {
		return nil, err
	}
	if cfg.ValidationIssuerURL, err = parseHTTPURL("VALIDATION_ISSUER_URL"); err != nil {
		return nil, err
	}
	if cfg.IssuerURL, err = parseHTTPURL("ISSUER_URL"); err != nil {
		return nil, err
	}
	cfg.AllowedOrigins = parseOrigins()
	if cfg.IgnoreExpiration, err = parseBoolEnv("IGNORE_EXPIRATION"); err != nil {
		return nil, err
	}
	if cfg.AWSRegion, err = parseRequiredEnv("AWS_REGION"); err != nil {
		return nil, err
	}
	if cfg.KMSKeyID, err = parseRequiredEnv("KMS_KEY_ID"); err != nil {
		return nil, err
	}

	return cfg, nil
}

func parsePort() (int, error) {
	portStr := os.Getenv("PORT")
	if portStr == "" {
		return 3000, nil
	}
	p, err := strconv.Atoi(portStr)
	if err != nil {
		return 0, fmt.Errorf("invalid PORT: %s", portStr)
	}
	if p < 1 || p > 65535 {
		return 0, fmt.Errorf("PORT out of range (1-65535): %d", p)
	}
	return p, nil
}

func parseOrigins() []string {
	raw := os.Getenv("ALLOWED_ORIGINS")
	if raw == "" {
		return nil
	}
	seen := make(map[string]struct{})
	var origins []string
	for _, o := range strings.Split(raw, ",") {
		o = strings.TrimSpace(o)
		if o == "" {
			continue
		}
		if _, exists := seen[o]; exists {
			continue
		}
		seen[o] = struct{}{}
		origins = append(origins, o)
	}
	return origins
}

func parseBoolEnv(name string) (bool, error) {
	v := os.Getenv(name)
	if v == "" {
		return false, nil
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return false, fmt.Errorf("invalid %s value %q: must be a boolean", name, v)
	}
	return b, nil
}

func parseRequiredEnv(name string) (string, error) {
	val := os.Getenv(name)
	if val == "" {
		return "", fmt.Errorf("missing required environment variable: %s", name)
	}
	return val, nil
}

func parseStringEnv(name string, fallback string) string {
	val := strings.TrimSpace(os.Getenv(name))
	if val == "" {
		return fallback
	}
	return val
}

func parseHTTPURL(name string) (string, error) {
	val, err := parseRequiredEnv(name)
	if err != nil {
		return "", err
	}
	u, err := url.Parse(val)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("%s must be an http(s) URL", name)
	}
	return val, nil
}
