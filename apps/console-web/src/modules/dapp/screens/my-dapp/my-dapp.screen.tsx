import { useEffect, useRef } from "react";
import { useGetMyDapp } from "@frontend/console-dapp/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { DappDto } from "@shared/console";
import { LoadError, RefreshError } from "../../../common/components/feedback/load-error/load-error";
import { LoadingScreen } from "../../../common/components/feedback/loading-screen/loading-screen";
import { DappView, LiveDapp } from "../../containers/dapp-view/dapp-view";
import { NewDapp } from "../../containers/new-dapp/new-dapp";

/**
 * Whether the dApp is still the owner's, so the page shows it rather than the first-visit card.
 * @param dapp The dApp.
 * @returns `true` unless it was removed.
 */
function isLive(dapp: DappDto): dapp is LiveDapp {
    return dapp.status !== "removed";
}

export function MyDappScreen(): React.JSX.Element {
    const translate = useTranslate();
    const dapp = useGetMyDapp();
    const live = dapp.data === undefined ? undefined : dapp.data !== null && isLive(dapp.data);
    const wasLive = useRef<boolean | undefined>(undefined);
    const replaced = wasLive.current !== undefined && live !== wasLive.current;
    useEffect(() => {
        if (live !== undefined) wasLive.current = live;
    });

    if (dapp.data === undefined) {
        if (!dapp.isError) return <LoadingScreen />;
        return (
            <LoadError
                title={translate("myDapp.loadError")}
                error={dapp.error}
                onRetry={() => void dapp.refetch()}
                retrying={dapp.isFetching}
            />
        );
    }
    return (
        <div className="flex min-h-full flex-col gap-10 pb-20 text-md leading-[1.5] text-ink">
            {dapp.isError && (
                <div className="mx-auto my-0 flex w-full max-w-[848px] flex-col gap-6">
                    <RefreshError error={dapp.error} />
                </div>
            )}
            {dapp.data && isLive(dapp.data) ? (
                <DappView dapp={dapp.data} focusTitle={replaced} reload={dapp.refetch} />
            ) : (
                <NewDapp focusHeading={replaced} />
            )}
        </div>
    );
}
