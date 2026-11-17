import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The enlarged logo's side, plus its padding and border, in pixels.
 */
const PREVIEW_SIZE = 218;
const PREVIEW_GAP = 8;
const VIEWPORT_MARGIN = 8;

type Position = { top: number; left: number };

/**
 * Places the preview below the thumbnail, or above it when the viewport has no room below, kept inside the viewport.
 * @param anchor The thumbnail's bounds.
 * @returns The preview's fixed position.
 */
function previewPosition(anchor: DOMRect): Position {
    const below = anchor.bottom + PREVIEW_GAP;
    const above = anchor.top - PREVIEW_GAP - PREVIEW_SIZE;
    const top = below + PREVIEW_SIZE <= window.innerHeight - VIEWPORT_MARGIN || above < VIEWPORT_MARGIN ? below : above;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, window.innerWidth - PREVIEW_SIZE - VIEWPORT_MARGIN));
    return { top, left };
}

export type LogoPreviewProps = {
    src: string;
    alt: string;
};

/**
 * A dApp logo's thumbnail that shows the logo enlarged while it is hovered or focused, and opens it in a new tab.
 * @param props The logo.
 * @param props.src The logo's URL.
 * @param props.alt The logo's text alternative.
 * @returns The thumbnail.
 */
export function LogoPreview({ src, alt }: LogoPreviewProps): React.JSX.Element {
    const thumbnail = useRef<HTMLAnchorElement>(null);
    const [position, setPosition] = useState<Position | null>(null);
    const open = position !== null;

    const show = (): void => {
        if (thumbnail.current) setPosition(previewPosition(thumbnail.current.getBoundingClientRect()));
    };
    const hide = (): void => setPosition(null);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") hide();
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", hide, { capture: true, passive: true });
        window.addEventListener("resize", hide);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", hide, { capture: true });
            window.removeEventListener("resize", hide);
        };
    }, [open]);

    return (
        <>
            <a
                ref={thumbnail}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-10 flex-none cursor-zoom-in items-center justify-center overflow-hidden rounded-[10px] border border-border bg-canvas text-faint hover:border-border-strong focus-visible:border-border-strong [&_img]:size-full [&_img]:object-contain"
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
            >
                <img src={src} alt={alt} />
            </a>
            {position &&
                createPortal(
                    <div
                        data-testid="logo-preview"
                        aria-hidden="true"
                        className="pointer-events-none fixed z-50 flex items-center justify-center rounded-lg border border-border bg-surface p-3 shadow-card"
                        style={{ top: position.top, left: position.left, width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                    >
                        <img src={src} alt="" className="size-full rounded-[6px] object-contain" />
                    </div>,
                    document.body,
                )}
        </>
    );
}
