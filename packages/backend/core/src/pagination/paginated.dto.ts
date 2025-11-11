import { ApiProperty } from "@nestjs/swagger";

export class Paginated<T> {
    @ApiProperty({ type: "number" })
    pages: number;
    @ApiProperty({ type: "number" })
    currentPage: number;
    @ApiProperty({ type: "array" })
    items: T[];
    @ApiProperty({ type: "number" })
    totalItems: number;
}
