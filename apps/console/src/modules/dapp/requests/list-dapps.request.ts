import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { MAX_PAGE } from "@shared/modules/dapp";

export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** The page an admin asks for. A regular user has at most one dApp, so their list fits on any page. */
export class ListDappsRequest {
    @ApiPropertyOptional({ type: "integer", minimum: 1, maximum: MAX_PAGE, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE)
    page?: number;

    @ApiPropertyOptional({ type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_SIZE)
    pageSize?: number;
}
