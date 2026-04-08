import { HealthCheckStatus, HealthDependencyCheckerResult } from "../types/health-check";

export class ReadyzResponseDto {
    status: HealthCheckStatus;
    checks: Record<string, HealthDependencyCheckerResult>;

    /**
     * Converts checkers to a ReadyzResponseDto.
     * @param checkers The checkers to convert.
     * @returns The ReadyzResponseDto.
     */
    static fromDependencyCheckers(checkers: Record<string, HealthDependencyCheckerResult>): ReadyzResponseDto {
        return {
            status: Object.values(checkers).every((checker) => checker.status === "ok") ? "ok" : "error",
            checks: checkers,
        };
    }
}
