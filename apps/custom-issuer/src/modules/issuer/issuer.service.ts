import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import { KeyService } from "./key.service";
import { JWT_ALGORITHM, SECONDS_IN_MILLISECOND } from "./issuer.constants";
import { ErrorMessage } from "./issuer.errors";
import { TokenClaims } from "./issuer.types";
import { Config } from "../../config";

@Injectable()
export class IssuerService {
    private readonly issuerUrl: string;
    private readonly validationIssuerUrl: string;

    constructor(
        private readonly keyService: KeyService,
        private readonly configService: ConfigService<Config>,
    ) {
        // Get issuer configuration from typed configuration
        const issuerConfig = this.configService.get<Config["issuer"]>("issuer");

        if (!issuerConfig) {
            throw new Error("Issuer configuration is missing");
        }

        if (!issuerConfig.issuerUrl) {
            throw new Error("Missing issuer URL in configuration. Please set ISSUER_URL environment variable.");
        }

        if (!issuerConfig.validationIssuerUrl) {
            throw new Error("Missing validation issuer URL in configuration. Please set VALIDATION_ISSUER_URL environment variable.");
        }

        this.issuerUrl = issuerConfig.issuerUrl;
        this.validationIssuerUrl = issuerConfig.validationIssuerUrl;
    }

    async issueToken(inputJwt: string, signPayload: number[]): Promise<string> {
        const decoded = this.verifyAndDecodeToken(inputJwt);
        const claims = this.extractAndValidateClaims(decoded, signPayload);
        return this.createSignedToken(claims);
    }

    private verifyAndDecodeToken(inputJwt: string): jwt.JwtPayload {
        const validationPublicKeys = this.keyService.getValidationPublicKeys();

        for (const publicKey of validationPublicKeys) {
            try {
                return jwt.verify(inputJwt, publicKey, {
                    algorithms: [JWT_ALGORITHM],
                }) as jwt.JwtPayload;
            } catch (_) {}
        }

        // If we get here, none of the keys worked
        throw new UnauthorizedException(ErrorMessage.INVALID_TOKEN);
    }

    private extractAndValidateClaims(decoded: jwt.JwtPayload, signPayload: number[]): TokenClaims {
        const { sub, exp, nbf, iss } = decoded;

        this.validateSubject(sub);
        this.validateIssuer(iss);
        this.validateTimeClaims(exp, nbf);

        return { sub, exp, nbf, fatxn: signPayload };
    }

    private validateSubject(sub: unknown): asserts sub is string {
        if (!sub || typeof sub !== "string") {
            throw new UnauthorizedException(ErrorMessage.MISSING_SUB);
        }
    }

    private validateIssuer(iss: unknown): void {
        if (!iss || typeof iss !== "string") {
            throw new UnauthorizedException(ErrorMessage.INVALID_ISSUER);
        }

        if (iss !== this.validationIssuerUrl) {
            throw new UnauthorizedException(ErrorMessage.INVALID_ISSUER);
        }
    }

    private validateTimeClaims(exp: unknown, nbf: unknown): void {
        const now = this.getCurrentTimestamp();

        if (exp !== undefined) {
            this.validateExpirationClaim(exp, now);
        }

        if (nbf !== undefined) {
            this.validateNotBeforeClaim(nbf, now);
        }

        if (exp !== undefined && nbf !== undefined) {
            this.validateTimeClaimConsistency(exp, nbf);
        }
    }

    private validateExpirationClaim(exp: unknown, now: number): asserts exp is number {
        if (!this.isValidInteger(exp)) {
            throw new UnauthorizedException(ErrorMessage.INVALID_EXP_TYPE);
        }

        if (exp <= now) {
            throw new UnauthorizedException(ErrorMessage.TOKEN_EXPIRED);
        }
    }

    private validateNotBeforeClaim(nbf: unknown, now: number): asserts nbf is number {
        if (!this.isValidInteger(nbf)) {
            throw new UnauthorizedException(ErrorMessage.INVALID_NBF_TYPE);
        }

        if (nbf > now) {
            throw new UnauthorizedException(ErrorMessage.TOKEN_NOT_YET_VALID);
        }
    }

    private validateTimeClaimConsistency(exp: number, nbf: number): void {
        if (exp <= nbf) {
            throw new UnauthorizedException(ErrorMessage.EXP_BEFORE_NBF);
        }
    }

    private isValidInteger(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value);
    }

    private getCurrentTimestamp(): number {
        return Math.floor(Date.now() / SECONDS_IN_MILLISECOND);
    }

    private createSignedToken(claims: TokenClaims): string {
        const signingKey = this.keyService.getSigningKey();
        const payload = this.buildTokenPayload(claims);

        return jwt.sign(payload, signingKey, {
            algorithm: JWT_ALGORITHM,
        });
    }

    private buildTokenPayload(claims: TokenClaims): jwt.JwtPayload {
        const payload: jwt.JwtPayload = {
            sub: claims.sub,
            iss: this.issuerUrl,
            fatxn: claims.fatxn,
        };

        if (claims.exp !== undefined) {
            payload.exp = claims.exp;
        }

        if (claims.nbf !== undefined) {
            payload.nbf = claims.nbf;
        }

        return payload;
    }
}
