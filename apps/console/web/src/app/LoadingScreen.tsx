import { Spinner } from "../ui/Spinner";

export function LoadingScreen() {
    return (
        <div className="flex items-center justify-center gap-3 px-4 py-16 text-ink-subtle" role="status">
            <Spinner />
            Loading…
        </div>
    );
}
