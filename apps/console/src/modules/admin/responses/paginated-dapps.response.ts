import { ApiProperty } from "@nestjs/swagger";
import { AdminDappResponse } from "./admin-dapp.response";

export class PaginatedDappsResponse {
    @ApiProperty({ type: [AdminDappResponse] })
    items: AdminDappResponse[];

    @ApiProperty({ type: "integer", description: "Every dApp that matches the filters." })
    total: number;

    @ApiProperty({ type: "integer" })
    page: number;

    @ApiProperty({ type: "integer" })
    pageSize: number;
}
