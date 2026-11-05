const TAG = "font-mono text-3xs font-medium tracking-kicker uppercase";

export const fieldClasses = {
    label: "font-mono text-2xs font-medium tracking-[0.08em] text-ink-3 uppercase",
    required: `${TAG} text-danger-ink`,
    optional: `${TAG} text-ink-subtle`,
    hint: "text-sm text-ink-subtle",
    control:
        "h-control w-full rounded-[12px] border border-border-strong bg-surface px-3 py-0 text-base text-ink placeholder:text-faint aria-invalid:border-danger-ink [textarea&]:h-auto [textarea&]:resize-y [textarea&]:py-[10px]",
    error: "text-sm text-danger-ink",
};
