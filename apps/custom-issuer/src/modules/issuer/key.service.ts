import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config';

@Injectable()
export class KeyService implements OnModuleInit {
  private readonly logger = new Logger(KeyService.name);
  private signingKey: string | null = null;
  private validationPublicKeys: string[] = [];
  private readonly keyBase64: string;
  private readonly validationPublicKeyUrl: string;

  constructor(private readonly configService: ConfigService<Config>) {
    // Get key configuration from typed configuration
    const issuerConfig = this.configService.get<Config['issuer']>('issuer');

    if (!issuerConfig) {
      throw new Error('Issuer configuration is missing');
    }

    this.keyBase64 = issuerConfig.keyBase64;
    this.validationPublicKeyUrl = issuerConfig.validationPublicKeyUrl;
  }

  async onModuleInit(): Promise<void> {
    // Load keys at startup to avoid blocking the event loop
    await this.loadKeys();
  }

  private async loadKeys(): Promise<void> {
    try {
      this.signingKey = this.decodeBase64Key(this.keyBase64);
      this.validationPublicKeys = await this.loadPublicKeysFromUrl(
        this.validationPublicKeyUrl,
      );
      this.logger.log(
        `Keys loaded successfully. Found ${this.validationPublicKeys.length} validation public key(s)`,
      );
    } catch (error) {
      this.logger.error('Failed to load keys', error);
      throw error;
    }
  }

  private decodeBase64Key(keyBase64: string): string {
    try {
      const decoded = Buffer.from(keyBase64.trim(), 'base64').toString('utf-8');
      
      // Validate that it looks like a PEM key
      if (!decoded.includes('-----BEGIN')) {
        throw new Error('Decoded key does not appear to be in PEM format');
      }
      
      // Ensure proper line endings and trim any extra whitespace
      // jsonwebtoken library is sensitive to key format
      const trimmed = decoded.trim();
      
      // Validate it's an RSA private key
      if (!trimmed.includes('RSA PRIVATE KEY') && !trimmed.includes('PRIVATE KEY')) {
        throw new Error('Decoded key does not appear to be a private key');
      }
      
      return trimmed;
    } catch (error) {
      throw new Error(
        `Failed to decode base64 key: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async loadPublicKeysFromUrl(url: string): Promise<string[]> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(
          `Failed to fetch public keys from URL: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();

      // Firebase typically returns JSON with certificates
      // Format: https://www.googleapis.com/robot/v1/metadata/x509/{email}
      if (contentType.includes('application/json')) {
        return this.parseFirebasePublicKeys(responseText);
      }

      // If it's already PEM format, return as single-item array
      if (responseText.includes('-----BEGIN')) {
        return [responseText];
      }

      // Try to parse as JSON and extract keys
      try {
        return this.parseFirebasePublicKeys(responseText);
      } catch {
        throw new Error(
          `Unable to parse public keys from URL. Expected PEM format or Firebase certificate format.`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load public keys from URL: ${error.message}`);
      }
      throw new Error('Failed to load public keys from URL: Unknown error');
    }
  }

  private parseFirebasePublicKeys(jsonResponse: string): string[] {
    try {
      const data = JSON.parse(jsonResponse);

      // Firebase certificate format: { "key-id-1": "-----BEGIN CERTIFICATE-----...", "key-id-2": "..." }
      // Firebase returns certificates in PEM format as values in a JSON object
      // Extract all certificates (Firebase typically has multiple keys for rotation)
      const certificateEntries = Object.entries(data) as [string, unknown][];
      const publicKeys: string[] = [];
      
      for (const [keyId, value] of certificateEntries) {
        if (typeof value === 'string' && value.includes('-----BEGIN')) {
          const publicKey = this.extractPublicKeyFromCertificate(value);
          publicKeys.push(publicKey);
          this.logger.log(
            `Loaded public key from Firebase URL (key-id: ${keyId})`,
          );
        }
      }

      if (publicKeys.length === 0) {
        // Firebase JWKS format: { "keys": [{ "n": "...", "e": "..." }] }
        if (data.keys && Array.isArray(data.keys) && data.keys.length > 0) {
          throw new Error(
            'JWKS format detected. Please use Firebase certificate URL format: https://www.googleapis.com/robot/v1/metadata/x509/{service-account-email}',
          );
        }

        throw new Error(
          'Unable to find certificates in Firebase response. Expected Firebase certificate format with PEM certificates.',
        );
      }

      return publicKeys;
    } catch (error) {
      if (error instanceof Error && error.message.includes('JWKS')) {
        throw error;
      }
      throw new Error(
        `Failed to parse Firebase public keys response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private extractPublicKeyFromCertificate(certificate: string): string {
    // Firebase returns X.509 certificates in PEM format
    // For JWT verification with RS256, we can use the certificate directly
    // as jsonwebtoken library accepts certificates for public key verification
    // However, if we need just the public key, we'd need to parse it
    // For now, return the certificate as-is since jwt.verify can handle certificates
    
    // Ensure the certificate is properly formatted
    if (!certificate.includes('-----BEGIN CERTIFICATE-----')) {
      throw new Error('Invalid certificate format: missing BEGIN marker');
    }
    
    if (!certificate.includes('-----END CERTIFICATE-----')) {
      throw new Error('Invalid certificate format: missing END marker');
    }

    return certificate.trim();
  }

  getSigningKey(): string {
    if (!this.signingKey) {
      throw new Error(
        'Signing key not loaded. Check application startup logs.',
      );
    }
    return this.signingKey;
  }

  getValidationPublicKeys(): string[] {
    if (this.validationPublicKeys.length === 0) {
      throw new Error(
        'Validation public keys not loaded. Check application startup logs.',
      );
    }
    return this.validationPublicKeys;
  }
}
