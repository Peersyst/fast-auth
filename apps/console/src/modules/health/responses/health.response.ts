import { ApiProperty } from "@nestjs/swagger";

export class HealthResponse {
    @ApiProperty({ enum: ["ok"] })
    status: "ok";

    /**
     * Builds the answer of a passing health check.
     * @returns The response.
     */
    static ok(): HealthResponse {
        return { status: "ok" };
    }
}
