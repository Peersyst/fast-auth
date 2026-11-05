import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min, MaxLength } from "class-validator";
import { DappStatus, MAX_PAGE, SEARCH_MAX_LENGTH } from "@shared/modules/dapp";
import { PaginatedRequest } from "@backend/core/pagination";
import { OrderType } from "@shared/utils";
import { HasNoNul } from "../../dapp/decorator/dapp-field.decorator";
import { DappOrderBy } from "../types/dapp-order";

export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListDappsRequest extends PaginatedRequest {
    @ApiPropertyOptional({
        description:
            "Only pending dApps and approved dApps with a pending change. Unless `orderBy` is given, they are sorted by how long they have waited for review, oldest first with `order=asc`.",
        default: false,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => (value === "true" ? true : value === "false" ? false : value))
    @IsBoolean()
    needsReview?: boolean;

    @ApiPropertyOptional({ enum: DappStatus, enumName: "DappStatus" })
    @IsOptional()
    @IsIn(Object.values(DappStatus))
    status?: DappStatus;

    @ApiPropertyOptional({
        description: "Case-insensitive substring of the name, owner email, contact email or Auth0 client id.",
        maxLength: SEARCH_MAX_LENGTH,
    })
    @IsOptional()
    @MaxLength(SEARCH_MAX_LENGTH)
    @HasNoNul()
    q?: string;

    @ApiPropertyOptional({ type: "integer", minimum: 1, maximum: MAX_PAGE, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE)
    declare page?: number;

    @ApiPropertyOptional({ type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_SIZE)
    declare pageSize?: number;

    @ApiPropertyOptional({ enum: DappOrderBy, enumName: "DappOrderBy" })
    @IsOptional()
    @IsIn(Object.values(DappOrderBy))
    declare orderBy?: DappOrderBy;

    @ApiPropertyOptional({ enum: OrderType, enumName: "OrderType", default: OrderType.ASC })
    @IsOptional()
    @IsIn(Object.values(OrderType))
    declare order?: OrderType;
}
