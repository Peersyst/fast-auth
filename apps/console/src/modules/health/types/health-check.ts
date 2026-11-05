export type HealthCheckStatus = "ok" | "error";

export interface HealthDependencyCheckerResult {
    status: HealthCheckStatus;
    message?: string;
}
