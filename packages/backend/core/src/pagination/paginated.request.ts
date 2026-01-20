import { ApiProperty } from "@nestjs/swagger";
import { OrderType } from "@shared/utils";

export class PaginatedRequest {
    @ApiProperty({
        name: "page",
        type: "integer",
        minimum: 1,
        required: false,
    })
    page?: number;

    @ApiProperty({
        name: "pageSize",
        type: "integer",
        minimum: 1,
        required: false,
    })
    pageSize?: number;

    @ApiProperty({
        name: "order",
        type: "string",
        enum: OrderType,
        required: false,
    })
    order?: OrderType;

    @ApiProperty({
        name: "orderBy",
        type: "string",
        required: false,
    })
    orderBy?: string;
}
