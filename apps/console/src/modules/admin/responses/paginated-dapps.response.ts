import { ApiProperty } from "@nestjs/swagger";
import type { Dapp } from "@shared/console-domain/dapp";
import type { Page } from "../../dapps/repositories/dapps.repository";
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

    /**
     * Maps one page of dApps to the admin view, with the total and the page it shows.
     * @param dapps The dApps on the page.
     * @param total Every dApp that matches the filters.
     * @param page The page number and size.
     * @returns The page.
     */
    static fromDapps(dapps: Dapp[], total: number, page: Page): PaginatedDappsResponse {
        return { items: dapps.map((dapp) => AdminDappResponse.fromDapp(dapp)), total, page: page.page, pageSize: page.pageSize };
    }
}
