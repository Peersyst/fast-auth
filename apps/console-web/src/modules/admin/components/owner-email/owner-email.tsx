import { useTranslate } from "@frontend/locale/react";
import { ERASED } from "@shared/modules/dapp";

/**
 * Whether the anonymiser erased the address.
 * @param email The address as stored.
 * @returns `true` for an erased one.
 */
export function isErased(email: string): boolean {
    return email === ERASED;
}

export type EmailProps = {
    email: string;
};

/**
 * An address as a label, such as the owner in a list row.
 * @param props The address.
 * @returns The address, or that it was erased.
 */
export function OwnerEmail({ email }: EmailProps): React.JSX.Element {
    const translate = useTranslate();
    return isErased(email) ? <span className="text-ink-subtle">{translate("admin.erased")}</span> : <>{email}</>;
}

/**
 * An address within a sentence, such as who removed the dApp.
 * @param props The address.
 * @returns The address, or that it was erased.
 */
export function EmailText({ email }: EmailProps): React.JSX.Element {
    const translate = useTranslate();
    return isErased(email) ? <span className="text-ink-subtle">{translate("admin.erasedAddress")}</span> : <>{email}</>;
}

/**
 * An address to write to.
 * @param props The address.
 * @returns A mail link, or that the address was erased.
 */
export function EmailLink({ email }: EmailProps): React.JSX.Element {
    const translate = useTranslate();
    return isErased(email) ? (
        <span className="text-ink-subtle">{translate("admin.erased")}</span>
    ) : (
        <a href={`mailto:${email}`} className="text-link">
            {email}
        </a>
    );
}
