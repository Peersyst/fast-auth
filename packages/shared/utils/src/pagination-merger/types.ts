export type PaginationMergerOptions<TItem> = {
    /**
     * An optional function to compare two items.
     * @param a
     * @param b
     * @returns `true` if `a` should be added before `b`, `false` otherwise.
     */
    compare?: (a: TItem, b: TItem) => boolean;
};

export type RestItem<KItem> = {
    /**
     * The rest of items.
     */
    items: KItem[];
    /**
     * Indicates if there are more items.
     */
    hasNextPage: boolean;
};

export type PaginationMergerGetPageParams<PageParams extends any[] = any[], Rest extends RestItem<any>[] = RestItem<any>[]> =
    | {
          /**
           * The next page params.
           */
          nextPageParams?: PageParams;
          /**
           * The rest of data.
           */
          rest?: Rest;
      }
    | undefined;

export type PaginationMergerGetPageResult<TItem, PageParams extends any[] = any[], Rest extends RestItem<any>[] = RestItem<any>[]> = {
    /**
     * The items of the page.
     */
    items: TItem[];
    /**
     * The next page params.
     */
    nextPageParams: PageParams;
    /**
     * The rest of data not added in the page (will be added in the following pages).
     */
    rest: Rest;
    /**
     * Indicates if the page is the last one.
     */
    isLastPage: boolean;
};

export type GetPageResult<KItem, KPageParams> = {
    /**
     * The items of the page.
     */
    items: KItem[];
    /**
     * The next page params.
     */
    nextPageParams: KPageParams;
    /**
     * Indicates if the page is the last one.
     */
    isLastPage: boolean;
};

export type PaginationMergerItemOptions<TItem, KItem = any, KPageParams = any> = {
    /**
     * The initial page params.
     */
    initialPageParams: KPageParams;
    /**
     * The function to get a page.
     * @param params The page params.
     * @returns The page result.
     */
    getPage(params: KPageParams): Promise<GetPageResult<KItem, KPageParams>>;
    /**
     * The function to parse an item.
     * @param item The item to parse.
     */
    parseItem(item: KItem): TItem;
};
