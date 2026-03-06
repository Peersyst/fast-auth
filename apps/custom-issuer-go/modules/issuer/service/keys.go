package service

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
)

const (
	defaultRefreshInterval = 5 * time.Minute
	retryBackoff           = 30 * time.Second
	httpTimeout            = 10 * time.Second
)

type firebaseKeyStore struct {
	mu       sync.RWMutex
	keys     []*rsa.PublicKey
	url      string
	stop     chan struct{}
	stopOnce sync.Once
}

func newFirebaseKeyStore(url string) *firebaseKeyStore {
	return &firebaseKeyStore{
		url:  url,
		stop: make(chan struct{}),
	}
}

// LoadKeys fetches keys from the URL.
func (s *firebaseKeyStore) LoadKeys() error {
	client := &http.Client{Timeout: httpTimeout}
	resp, err := client.Get(s.url)
	if err != nil {
		return fmt.Errorf("failed to fetch public keys: %w", err)
	}
	defer func(Body io.ReadCloser) {
		_ = Body.Close()
	}(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch public keys: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read public keys response: %w", err)
	}

	keys, err := parsePublicKeys(body)
	if err != nil {
		return err
	}

	if len(keys) == 0 {
		return fmt.Errorf("no valid public keys found at %s", s.url)
	}

	s.mu.Lock()
	s.keys = keys
	s.mu.Unlock()

	logger.Info("loaded Firebase public keys", "count", len(keys))

	return nil
}

// GetKeys returns a copy of the current set of public keys.
func (s *firebaseKeyStore) GetKeys() []*rsa.PublicKey {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*rsa.PublicKey, len(s.keys))
	copy(result, s.keys)
	return result
}

// StartRefresh starts a background goroutine that refreshes keys at a fixed interval.
func (s *firebaseKeyStore) StartRefresh() {
	go func() {
		interval := defaultRefreshInterval
		for {
			select {
			case <-s.stop:
				return
			case <-time.After(interval):
				err := s.LoadKeys()
				if err != nil {
					logger.Error("failed to refresh Firebase public keys, retrying", "error", err, "retry_in", retryBackoff.String())
					interval = retryBackoff
				} else {
					interval = defaultRefreshInterval
				}
			}
		}
	}()
}

// Stop stops the background refresh goroutine. Safe to call multiple times.
func (s *firebaseKeyStore) Stop() {
	s.stopOnce.Do(func() { close(s.stop) })
}

func parsePublicKeys(body []byte) ([]*rsa.PublicKey, error) {
	bodyStr := strings.TrimSpace(string(body))

	// Direct PEM response (single key)
	if strings.HasPrefix(bodyStr, "-----BEGIN") {
		key, err := parsePEMCertificate([]byte(bodyStr))
		if err != nil {
			return nil, fmt.Errorf("failed to parse PEM certificate: %w", err)
		}
		logger.Info("loaded validation key", "kid", "direct-pem")
		return []*rsa.PublicKey{key}, nil
	}

	// Try JSON
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("failed to parse public keys response: %w", err)
	}

	// Reject JWKS format
	if _, hasKeys := raw["keys"]; hasKeys {
		return nil, fmt.Errorf("JWKS format is not supported; use the certificate URL format (e.g., https://www.googleapis.com/robot/v1/metadata/x509/{service-account})")
	}

	// Firebase certificate JSON: { "kid": "-----BEGIN CERTIFICATE-----..." }
	var certMap map[string]string
	if err := json.Unmarshal(body, &certMap); err != nil {
		return nil, fmt.Errorf("failed to parse public keys JSON: %w", err)
	}

	var pubKeys []*rsa.PublicKey
	for kid, certPEM := range certMap {
		key, err := parsePEMCertificate([]byte(certPEM))
		if err != nil {
			logger.Warn("skipping key", "kid", kid, "error", err)
			continue
		}
		logger.Info("loaded validation key", "kid", kid)
		pubKeys = append(pubKeys, key)
	}

	if len(pubKeys) == 0 {
		return nil, fmt.Errorf("no valid public keys found")
	}

	return pubKeys, nil
}

// parsePEMCertificate extracts an RSA public key from a CERTIFICATE PEM block.
// Firebase's x509 endpoint only serves CERTIFICATE blocks, so "PUBLIC KEY" and
// "RSA PUBLIC KEY" types are intentionally unsupported for now.
func parsePEMCertificate(pemData []byte) (*rsa.PublicKey, error) {
	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %w", err)
	}

	rsaKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("certificate key is not RSA")
	}

	return rsaKey, nil
}
