import { RefObject, useEffect, useRef, useState } from "react";

export type UseHeadingFocusResult = {
    heading: RefObject<HTMLHeadingElement>;
    /**
     * Moves focus to the heading once the next render commits, as a view switch replaces what had focus.
     */
    focusHeadingAfterRender: () => void;
};

/**
 * Moves focus to a heading after a render the caller asks for.
 * @param focusOnMount Whether to move focus once the heading first renders.
 * @returns The heading's ref and the request to focus it.
 */
export function useHeadingFocus(focusOnMount: boolean): UseHeadingFocusResult {
    const heading = useRef<HTMLHeadingElement>(null);
    // A state update, unlike a ref, commits together with the caller's own updates, so the focus lands after a dialog
    // they close has handed focus back, even when a store re-renders the component in between.
    const [requests, setRequests] = useState(focusOnMount ? 1 : 0);
    useEffect(() => {
        if (requests > 0) heading.current?.focus();
    }, [requests]);

    return {
        heading,
        focusHeadingAfterRender: () => setRequests((count) => count + 1),
    };
}
