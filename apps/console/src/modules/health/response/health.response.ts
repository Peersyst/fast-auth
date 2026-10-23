import { ApiProperty } from "@nestjs/swagger";

export class HealthResponse {
    @ApiProperty({ enum: ["ok"] })
    status: "ok";
}
