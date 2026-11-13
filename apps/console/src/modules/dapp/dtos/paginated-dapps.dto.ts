import { ApiProperty } from "@nestjs/swagger";
import { Paginated } from "@backend/core/pagination";
import { Dapp, DappChange } from "@database/console/entities";
import { DappDto } from "./dapp.dto";

export class PaginatedDappsDto extends Paginated<DappDto> {
    @ApiProperty({ type: [DappDto] })
    declare items: DappDto[];

    /**
     * Maps one page of dApps with their pending changes, with the page it shows and the count of every match.
     * @param dapps The dApps on the page.
     * @param pendingChanges The pending changes of the dApps on the page.
     * @param totalItems Every dApp that matches the filters.
     * @param currentPage The page number.
     * @param pageSize The page size.
     * @returns The page.
     */
    static fromEntities(
        dapps: Dapp[],
        pendingChanges: DappChange[],
        totalItems: number,
        currentPage: number,
        pageSize: number,
    ): PaginatedDappsDto {
        const pendingChangeByDappId = new Map(pendingChanges.map((change) => [change.dappId, change]));
        return {
            items: dapps.map((dapp) => DappDto.fromEntity(dapp, pendingChangeByDappId.get(dapp.id) ?? null)),
            totalItems,
            currentPage,
            pages: Math.ceil(totalItems / pageSize),
        };
    }
}
