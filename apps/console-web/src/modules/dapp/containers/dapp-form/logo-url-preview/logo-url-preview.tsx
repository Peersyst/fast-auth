import { useEffect, useState } from "react";
import { useTranslate } from "@frontend/locale/react";
import { isLogoUrl } from "@shared/modules/dapp";

/**
 * How long the URL must stay unchanged before the preview loads it, so typing does not fetch every prefix.
 */
const SETTLE_MS = 400;

export type LogoUrlPreviewProps = {
    url: string;
};

/**
 * Previews the logo at a valid logo URL once it stops changing, and warns when the URL does not load as an image.
 * @param props The preview's props.
 * @param props.url The logo URL as entered.
 * @returns The preview, or nothing until the URL is valid.
 */
export function LogoUrlPreview({ url }: LogoUrlPreviewProps): React.JSX.Element | null {
    const translate = useTranslate();
    const [settled, setSettled] = useState(url);
    const [loaded, setLoaded] = useState<string | null>(null);
    const [failed, setFailed] = useState<string | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => setSettled(url.trim()), SETTLE_MS);
        return () => clearTimeout(timeout);
    }, [url]);

    if (settled !== url.trim() || !isLogoUrl(settled)) return null;
    const broken = failed === settled;

    return (
        <div className="flex items-center gap-3 text-sm" aria-live="polite">
            <span className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] border border-border bg-canvas [&_img]:size-full [&_img]:object-contain">
                {!broken && <img src={settled} alt="" onLoad={() => setLoaded(settled)} onError={() => setFailed(settled)} />}
            </span>
            {broken ? (
                <span className="text-warning-ink">{translate("dappForm.logoUrl.notAnImage")}</span>
            ) : (
                loaded === settled && <span className="text-ink-subtle">{translate("dappForm.logoUrl.preview")}</span>
            )}
        </div>
    );
}
