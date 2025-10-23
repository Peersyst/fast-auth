import { GetPageResult, PaginationMergerItemOptions } from "./types";

/**
 * Utility class to create a pagination merger item.
 */
export class PaginationMergerItem<TItem, KItem = any, KPageParams = any> {
    /**
     * The initial page params.
     */
    readonly initialPageParams: KPageParams;
    /**
     * The function to get a page.
     * @param params The page params.
     * @returns The page result.
     */
    readonly getPage: (params: KPageParams) => Promise<GetPageResult<KItem, KPageParams>>;
    /**
     * The function to parse an item.
     * @param item The item to parse.
     */
    readonly parseItem: (item: KItem) => TItem;

    constructor({ initialPageParams, getPage, parseItem }: PaginationMergerItemOptions<TItem, KItem, KPageParams>) {
        this.initialPageParams = initialPageParams;
        this.getPage = getPage;
        this.parseItem = parseItem;
    }
}
