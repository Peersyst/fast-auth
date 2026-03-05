package service

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/kms"
	"github.com/aws/aws-sdk-go-v2/service/kms/types"
	"github.com/peersyst/fast-auth/apps/custom-issuer/config"
	"github.com/peersyst/fast-auth/apps/custom-issuer/logger"
)

// KMSService handles JWT signing via AWS KMS.
type KMSService struct {
	client *kms.Client
	keyID  string
}

// NewKMSService creates a new KMSService and verifies connectivity to AWS KMS.
func NewKMSService(cfg *config.Config) (*KMSService, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(cfg.AWSRegion),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := kms.NewFromConfig(awsCfg)

	// Verify the key exists and is available.
	resp, err := client.DescribeKey(ctx, &kms.DescribeKeyInput{
		KeyId: &cfg.KMSKeyID,
	})
	if err != nil {
		return nil, fmt.Errorf("KMS key %s not accessible: %w", cfg.KMSKeyID, err)
	}

	if resp.KeyMetadata.KeyState != types.KeyStateEnabled {
		return nil, fmt.Errorf("KMS key %s is not enabled (state: %s)", cfg.KMSKeyID, resp.KeyMetadata.KeyState)
	}

	// Verify the key supports RSASSA_PKCS1_V1_5_SHA_256 (RS256).
	supported := false
	for _, alg := range resp.KeyMetadata.SigningAlgorithms {
		if alg == types.SigningAlgorithmSpecRsassaPkcs1V15Sha256 {
			supported = true
			break
		}
	}
	if !supported {
		return nil, fmt.Errorf("KMS key %s does not support RS256 signing", cfg.KMSKeyID)
	}

	logger.Info("KMS connected and available",
		"keyId", cfg.KMSKeyID,
		"keyState", string(resp.KeyMetadata.KeyState),
	)

	return &KMSService{client: client, keyID: cfg.KMSKeyID}, nil
}

// jwtHeader is the pre-encoded RS256 JWT header: {"alg":"RS256","typ":"JWT"}
var jwtHeader = base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256","typ":"JWT"}`))

// SignJWT builds a JWT from the JSON-encoded payload and signs it via AWS KMS.
// It mirrors how the NestJS jsonwebtoken library assembles JWTs:
// base64url(header).base64url(payload).base64url(signature)
func (s *KMSService) SignJWT(ctx context.Context, payload []byte) (string, error) {
	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	signingInput := jwtHeader + "." + encodedPayload

	digest := sha256.Sum256([]byte(signingInput))

	resp, err := s.client.Sign(ctx, &kms.SignInput{
		KeyId:            &s.keyID,
		Message:          digest[:],
		MessageType:      types.MessageTypeDigest,
		SigningAlgorithm: types.SigningAlgorithmSpecRsassaPkcs1V15Sha256,
	})
	if err != nil {
		return "", fmt.Errorf("KMS sign failed: %w", err)
	}

	encodedSig := base64.RawURLEncoding.EncodeToString(resp.Signature)
	return signingInput + "." + encodedSig, nil
}
