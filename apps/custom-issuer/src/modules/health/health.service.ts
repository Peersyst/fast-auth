import { Injectable, Logger } from "@nestjs/common";
import { ReadyzResponseDto } from "./dtos/readyz.dto";
import { HealthDependencyCheckerResult } from "./types/health-check";
import { KeyService } from "../issuer/key.service";

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);

    constructor(private readonly keyService: KeyService) {}

    async checkHealth(): Promise<ReadyzResponseDto> {
        return ReadyzResponseDto.fromDependencyCheckers({
            "validation-keys": await this.checkValidationKeys(),
        });
    }

    private checkValidationKeys(): HealthDependencyCheckerResult {
        try {
            // Throws if no keys are loaded
            this.keyService.getValidationPublicKeys();
            return { status: "ok" };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`Validation keys health check failed: ${errorMessage}`);
            return { status: "error", message: errorMessage };
        }
    }
}
