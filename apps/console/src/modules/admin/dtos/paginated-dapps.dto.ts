import { ApiProperty } from "@nestjs/swagger";
import { Paginated } from "@backend/core/pagination";
import { Dapp } from "@database/console/entities";
import { AdminDappDto } from "./admin-dapp.dto";

export class PaginatedDappsDto extends Paginated<AdminDappDto> {
    @ApiProperty({ type: [AdminDappDto] })
    declare items: AdminDappDto[];

    /**
     * Maps one page of dApps to the admin view, with the page it shows and the count of every match.
     * @param dapps The dApps on the page.
     * @param totalItems Every dApp that matches the filters.
     * @param currentPage The page number.
     * @param pageSize The page size.
     * @returns The page.
     */
    static fromEntities(dapps: Dapp[], totalItems: number, currentPage: number, pageSize: number): PaginatedDappsDto {
        return {
            items: dapps.map((dapp) => AdminDappDto.fromEntity(dapp)),
            totalItems,
            currentPage,
            pages: Math.ceil(totalItems / pageSize),
        };
    }
}
