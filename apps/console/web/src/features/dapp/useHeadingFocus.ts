import { useEffect, useRef } from "react";

export function useHeadingFocus(focusOnMount: boolean) {
    const heading = useRef<HTMLHeadingElement>(null);
    const moveFocus = useRef(focusOnMount);
    useEffect(() => {
        if (!moveFocus.current) return;
        moveFocus.current = false;
        heading.current?.focus();
    });

    const focusHeadingAfterRender = () => {
        moveFocus.current = true;
    };
    return { heading, focusHeadingAfterRender };
}
