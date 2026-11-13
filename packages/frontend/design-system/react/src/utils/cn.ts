import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and resolves conflicting Tailwind utilities, the last one winning.
 * @param inputs The class names.
 * @returns The merged class name.
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
