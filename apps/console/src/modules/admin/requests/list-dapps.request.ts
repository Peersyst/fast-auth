import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min, MaxLength } from "class-validator";
import { DappStatus } from "../../../domain/dapp";
import { MAX_PAGE, SEARCH_MAX_LENGTH } from "../../../domain/field-rules";
import { HasNoNul } from "../../dapps/requests/dapp-field.decorators";
import { DappOrderBy, SortOrder } from "../../dapps/repositories/dapps.repository";

export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListDappsRequest {
    @ApiPropertyOptional({
        description:
            "Only pending dApps and approved dApps with a pending change. Unless `orderBy` is given, they are sorted by how long they have waited for review, oldest first with `order=asc`.",
        default: false,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => (value === "true" ? true : value === "false" ? false : value))
    @IsBoolean()
    needsReview?: boolean;

    @ApiPropertyOptional({ enum: Object.values(DappStatus), enumName: "DappStatus" })
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
    page?: number;

    @ApiPropertyOptional({ type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_SIZE)
    pageSize?: number;

    @ApiPropertyOptional({ enum: Object.values(DappOrderBy), enumName: "DappOrderBy" })
    @IsOptional()
    @IsIn(Object.values(DappOrderBy))
    orderBy?: DappOrderBy;

    @ApiPropertyOptional({ enum: Object.values(SortOrder), enumName: "SortOrder", default: SortOrder.Asc })
    @IsOptional()
    @IsIn(Object.values(SortOrder))
    order?: SortOrder;
}
