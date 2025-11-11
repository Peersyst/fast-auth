export interface Paginated<T> {
    pages: number;
    currentPage: number;
    items: T[];
}
