import { errorMessage } from "../api/error-message";
import { Button } from "../ui/Button";
import { Callout } from "../ui/Callout";
import styles from "./app.module.css";

type LoadErrorProps = {
    title: string;
    error: unknown;
    onRetry: () => void;
    retrying: boolean;
};

export function LoadError({ title, error, onRetry, retrying }: LoadErrorProps) {
    return (
        <div className={styles.boot}>
            <Callout tone="error" title={title}>
                <p>{errorMessage(error)}</p>
            </Callout>
            <Button variant="secondary" loading={retrying} onClick={onRetry}>
                Try again
            </Button>
        </div>
    );
}

export function RefreshError({ error }: { error: unknown }) {
    return (
        <Callout tone="warning" title="Could not refresh, so this may be out of date">
            <p>{errorMessage(error)}</p>
        </Callout>
    );
}
