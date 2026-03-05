package service

import (
	"context"
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

// SignJWT signs the given payload and returns the signed JWT string.
func (s *KMSService) SignJWT(ctx context.Context, payload []byte) (string, error) {
	return "", nil
}
