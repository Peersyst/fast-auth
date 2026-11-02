import { ERASED } from "@shared/console-domain/dapp";

export function isErased(email: string): boolean {
    return email === ERASED;
}

export function OwnerEmail({ email }: { email: string }) {
    return isErased(email) ? <span className="text-ink-subtle">Erased</span> : <>{email}</>;
}

export function EmailText({ email }: { email: string }) {
    return isErased(email) ? <span className="text-ink-subtle">an erased address</span> : <>{email}</>;
}

export function EmailLink({ email }: { email: string }) {
    return isErased(email) ? (
        <span className="text-ink-subtle">Erased</span>
    ) : (
        <a href={`mailto:${email}`} className="text-link">
            {email}
        </a>
    );
}
