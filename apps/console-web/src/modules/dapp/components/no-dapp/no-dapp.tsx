import { useEffect, useRef } from "react";
import { Trans } from "react-i18next";
import { Button } from "@frontend/design-system-react/button";
import { Card } from "@frontend/design-system-react/card";
import { GridIcon, PlusIcon } from "@frontend/design-system-react/icons";
import { useTranslate } from "@frontend/locale/react";
import { config } from "../../../../config";

const KICKER = "font-mono text-xs font-medium tracking-kicker text-ink-subtle uppercase";

export type NoDappFocus = "heading" | "register" | undefined;

export type NoDappProps = {
    email: string;
    /**
     * What to move focus to once the card shows: its heading after the dApp went away, Register after the form was cancelled.
     */
    focus: NoDappFocus;
    onRegister: () => void;
};

export function NoDapp({ email, focus, onRegister }: NoDappProps): React.JSX.Element {
    const translate = useTranslate();
    const { nearNetwork, applyDocsUrl, supportUrl } = config;
    const heading = useRef<HTMLHeadingElement>(null);
    const register = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (focus === "heading") heading.current?.focus();
        if (focus === "register") register.current?.focus();
    }, [focus]);

    return (
        <div className="flex flex-auto flex-col items-center justify-center gap-4">
            <Card className="flex w-full max-w-[520px] flex-col items-center gap-6 px-10 py-12 text-center">
                <span className="flex size-14 items-center justify-center rounded-lg border border-dashed border-border-strong bg-canvas text-ink-subtle">
                    <GridIcon />
                </span>
                <div className="flex flex-col items-center gap-2 [&_h1]:text-[30px] [&_h1]:leading-[1.05] [&_h1]:font-bold [&_h1]:tracking-[-0.025em] [&_h1:focus]:outline-none">
                    <p className={KICKER}>{translate("myDapp.access", { network: translate(`dapp.networks.${nearNetwork}`) })}</p>
                    <h1 ref={heading} tabIndex={-1}>
                        {translate("myDapp.noDapp.title")}
                    </h1>
                    <p className="max-w-[42ch] text-ink-subtle wrap-anywhere">
                        <Trans
                            i18nKey="myDapp.noDapp.description"
                            values={{ network: nearNetwork, email }}
                            components={{
                                code: <code className="rounded-[4px] bg-surface-muted px-1.5 py-px font-mono text-base" />,
                                strong: <strong />,
                            }}
                        />
                    </p>
                </div>
                <Button ref={register} className="h-[52px] px-6 py-0" onClick={onRegister}>
                    <PlusIcon size={18} />
                    {translate("myDapp.noDapp.register")}
                </Button>
                <a className={`${KICKER} no-underline`} href={applyDocsUrl}>
                    {translate("myDapp.noDapp.howApproval")}
                </a>
            </Card>
            <p className="m-0 max-w-[520px] text-center text-sm leading-[1.5] text-ink-subtle [&_a]:text-link">
                <Trans i18nKey="myDapp.noDapp.legacy" components={{ contact: <a href={supportUrl} /> }} />
            </p>
        </div>
    );
}
