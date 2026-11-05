import { HealthCheckStatus, HealthDependencyCheckerResult } from "../types/health-check";

export class ReadyzResponseDto {
    status: HealthCheckStatus;
    checks: Record<string, HealthDependencyCheckerResult>;

    /**
     * Creates a ReadyzResponseDto from a record of HealthDependencyCheckerResult.
     * @param checkers The record of HealthDependencyCheckerResult.
     * @returns The ReadyzResponseDto.
     */
    static fromDependencyCheckers(checkers: Record<string, HealthDependencyCheckerResult>): ReadyzResponseDto {
        return {
            status: Object.values(checkers).every((checker) => checker.status === "ok") ? "ok" : "error",
            checks: checkers,
        };
    }
}
