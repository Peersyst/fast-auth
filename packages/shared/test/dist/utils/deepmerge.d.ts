export declare function isPlainObject(item: unknown): item is Record<keyof any, unknown>;
export interface DeepmergeOptions {
    clone?: boolean;
}
export default function deepmerge<T, Q>(target: T, source: Q, options?: DeepmergeOptions): T & Q;
