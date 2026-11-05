import { cva } from "class-variance-authority";

// The leading follows the size: tailwind-merge drops a leading that comes before a font size.
export const pageTitleVariants = cva("font-bold tracking-[-0.025em] wrap-anywhere", {
    variants: {
        size: {
            medium: "text-[36px] leading-[1.05]",
            large: "text-[40px] leading-[1.05]",
        },
    },
});
