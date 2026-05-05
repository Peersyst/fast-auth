import type { ReactNode } from "react";

type Kind = "account" | "tx" | "block";

const BASE = "https://nearblocks.io";

function buildHref(kind: Kind, value: string): string {
  switch (kind) {
    case "account":
      return `${BASE}/address/${encodeURIComponent(value)}`;
    case "tx":
      return `${BASE}/txns/${encodeURIComponent(value)}`;
    case "block":
      return `${BASE}/blocks/${encodeURIComponent(value)}`;
  }
}

export default function NearblocksLink({
  kind,
  value,
  children,
  className = "explorerLink",
  emptyFallback = "—",
}: {
  kind: Kind;
  value: string | number | null | undefined;
  children?: ReactNode;
  className?: string;
  emptyFallback?: ReactNode;
}) {
  if (value === null || value === undefined || value === "" || value === "—") {
    return <>{emptyFallback}</>;
  }

  const asString = typeof value === "string" ? value : String(value);

  return (
    <a
      className={className}
      href={buildHref(kind, asString)}
      target="_blank"
      rel="noopener noreferrer"
      title={asString}
    >
      {children ?? asString}
    </a>
  );
}
