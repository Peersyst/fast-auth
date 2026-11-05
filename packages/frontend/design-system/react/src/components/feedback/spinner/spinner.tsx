export function Spinner(): React.JSX.Element {
    return (
        <span
            className="inline-block size-[1em] flex-none animate-spin rounded-[50%] border-2 border-current border-r-transparent motion-reduce:animate-[spin_2.4s_linear_infinite]"
            aria-hidden="true"
        />
    );
}
