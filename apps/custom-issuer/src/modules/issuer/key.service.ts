import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Config } from '../../config';

@Injectable()
export class KeyService implements OnModuleInit {
  private readonly logger = new Logger(KeyService.name);
  private signingKey: string | null = null;
  private validationPublicKey: string | null = null;
  private readonly allowedBasePath: string;
  private readonly keyPath: string;
  private readonly validationPublicKeyPath: string;

  constructor(private readonly configService: ConfigService<Config>) {
    // Get key paths from typed configuration
    const issuerConfig = this.configService.get<Config['issuer']>('issuer');

    if (!issuerConfig) {
      throw new Error('Issuer configuration is missing');
    }

    this.keyPath = issuerConfig.keyPath;
    this.validationPublicKeyPath = issuerConfig.validationPublicKeyPath;

    // Set allowed base path to prevent path traversal
    // Note: KEYS_BASE_PATH is optional and not part of typed config, so access directly from env
    this.allowedBasePath = process.env.KEYS_BASE_PATH || process.cwd();
  }

  async onModuleInit(): Promise<void> {
    // Load keys at startup to avoid blocking the event loop
    await this.loadKeys();
  }

  private async loadKeys(): Promise<void> {
    try {
      this.signingKey = await this.loadKeyFile(this.keyPath.trim());
      this.validationPublicKey = await this.loadKeyFile(
        this.validationPublicKeyPath.trim(),
      );
      this.logger.log('Keys loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load keys', error);
      throw error;
    }
  }

  private async loadKeyFile(keyPath: string): Promise<string> {
    const resolvedPath = path.resolve(keyPath);
    this.validateKeyPath(resolvedPath);
    return await fs.readFile(resolvedPath, 'utf-8');
  }

  private validateKeyPath(keyPath: string): void {
    const normalizedPath = path.normalize(keyPath);
    const allowedBase = path.resolve(this.allowedBasePath);

    // Check if the resolved path is within the allowed base directory
    if (!normalizedPath.startsWith(allowedBase)) {
      throw new Error(
        `Path traversal detected: Key path "${keyPath}" resolves to "${normalizedPath}" which is outside allowed base directory "${allowedBase}"`,
      );
    }

    // Additional check: ensure path is absolute
    if (!path.isAbsolute(normalizedPath)) {
      throw new Error(
        `Invalid key path: "${keyPath}" must resolve to an absolute path`,
      );
    }
  }

  getSigningKey(): string {
    if (!this.signingKey) {
      throw new Error(
        'Signing key not loaded. Check application startup logs.',
      );
    }
    return this.signingKey;
  }

  getValidationPublicKey(): string {
    if (!this.validationPublicKey) {
      throw new Error(
        'Validation public key not loaded. Check application startup logs.',
      );
    }
    return this.validationPublicKey;
  }
}
