export function Spinner() {
    return (
        <span
            className="inline-block size-[1em] flex-none rounded-[50%] border-2 border-current border-r-transparent animate-spin motion-reduce:animate-[spin_2.4s_linear_infinite]"
            aria-hidden="true"
        />
    );
}
