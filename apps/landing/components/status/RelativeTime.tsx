"use client";

import { useEffect, useState } from "react";

import { relativeTime } from "./format";

// Render a relative time string ("12s ago") that's safe across SSR + hydrate.
// `relativeTime` calls `Date.now()`, which differs between server-render and
// client-hydrate — that mismatched text breaks React's hydration recovery on
// slow mobile devices and can leave neighboring client components without
// their effects/handlers ever wired up. We render a stable placeholder on
// first paint (matches server) and patch in the real value via useEffect.
export default function RelativeTime({
  iso,
  refresh = 30_000,
  fallback = "—",
}: {
  iso: string | null | undefined;
  refresh?: number;
  fallback?: string;
}) {
  const [text, setText] = useState<string>(fallback);

  useEffect(() => {
    setText(relativeTime(iso));
    if (!iso) return;
    const id = setInterval(() => setText(relativeTime(iso)), refresh);
    return () => clearInterval(id);
  }, [iso, refresh]);

  return <>{text}</>;
}
