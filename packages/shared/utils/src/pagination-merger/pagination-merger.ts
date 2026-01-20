import { defaultCompare } from "./default-compare";
import { PaginationMergerItem } from "./pagination-merger-item";
import { PaginationMergerGetPageParams, PaginationMergerGetPageResult, RestItem, PaginationMergerOptions } from "./types";

/**
 * Class that merges multiple paginated sources into a single paginated source.
 */
export class PaginationMerger<TItem> {
    private readonly compare: (a: TItem, b: TItem) => boolean;

    constructor(
        private readonly paginationMergerItems: PaginationMergerItem<TItem>[],
        { compare = defaultCompare }: PaginationMergerOptions<TItem> = {},
    ) {
        this.compare = compare;
    }

    /**
     * Gets a page of the specified merger item index.
     * @param index The index of the merger item.
     * @param rest A reference to the rest array.
     * @param pageParams A reference to the page params array.
     */
    private async getPaginationMergerItemPage(index: number, rest: RestItem<any>[], pageParams: any[]): Promise<void> {
        const res = await this.paginationMergerItems[index].getPage(pageParams[index]);

        // Update the `hasNextPage` and `pageParams`
        rest[index].hasNextPage = !res.isLastPage;
        pageParams[index] = res.nextPageParams;

        // If the result included items, add them to the rest. Otherwise request the next page.
        if (res.items.length) {
            rest[index].items = [...rest[index].items, ...res.items];
        } else if (!res.isLastPage) {
            await this.getPaginationMergerItemPage(index, rest, pageParams);
        }
    }

    /**
     * Gets a page of items from all the paginated sources.
     * @param pageSize The size of the page.
     * @param params The page params.
     * @returns The resulting page including the items.
     */
    async getPage(
        pageSize: number,
        {
            rest: accRest = this.paginationMergerItems.map(() => ({ items: [] as any, hasNextPage: true })),
            nextPageParams = this.paginationMergerItems.map((item) => item.initialPageParams),
        }: PaginationMergerGetPageParams = {},
    ): Promise<PaginationMergerGetPageResult<TItem>> {
        // Copy the rest and page params to avoid modifying the original ones
        const rest = [...accRest];
        const pageParams = [...nextPageParams];

        const getPaginationMergerItemsPagePromises: Promise<void>[] = [];
        const items: TItem[] = [];
        // Indicates if the current page is the last one
        let isLastPage = false;
        // Holds the number of items that have no more items
        let noMoreItemsCounter: number;

        // Fill the items array with `pageSize` items
        for (let i = 0; i < pageSize; i++) {
            noMoreItemsCounter = 0;

            // For each item, if it has no items, request the next page
            for (let j = 0; j < this.paginationMergerItems.length; j++) {
                if (rest[j].items.length === 0) {
                    if (rest[j].hasNextPage) {
                        getPaginationMergerItemsPagePromises.push(this.getPaginationMergerItemPage(j, rest, pageParams));
                    } else {
                        // If there are no items and no next page, increment the `noMoreItemsCounter` counter
                        noMoreItemsCounter++;
                    }
                }
            }

            // If all items have no more items, break the loop and set the `isLastPage` flag
            if (noMoreItemsCounter === this.paginationMergerItems.length) {
                isLastPage = true;
                break;
            }

            await Promise.all(getPaginationMergerItemsPagePromises);

            // Compare the items of all the sources and pick the one that should be added to the items array
            const [item, itemIndex] = rest.reduce(
                (acc, curr, j) => {
                    if (acc[0] === null && curr.items[0]) {
                        return [this.paginationMergerItems[j].parseItem(curr.items[0]), j];
                    } else {
                        const parsedCurr = curr.items[0] ? this.paginationMergerItems[j].parseItem(curr.items[0]) : null;

                        if (parsedCurr && this.compare(parsedCurr, acc[0] as TItem)) {
                            return [parsedCurr, j];
                        } else {
                            return acc;
                        }
                    }
                },
                [null, -1] as [TItem | null, number],
            );

            // If an item was picked, add it to the items array and remove it from its rest array
            if (item) {
                items.push(item);
                rest[itemIndex].items.splice(0, 1);
            }
        }

        return {
            items,
            nextPageParams: pageParams,
            rest,
            isLastPage,
        };
    }
}
