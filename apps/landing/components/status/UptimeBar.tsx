type Props = {
  // 24 hourly success-rate values, oldest → most recent.
  data: number[];
  label: string;
  coverage?: string;
  // Anchor for tooltip times: the most recent bucket ends here.
  anchor: string;
};

export default function UptimeBar({ data, label, coverage, anchor }: Props) {
  const anchorMs = new Date(anchor).getTime();
  const validAnchor = Number.isFinite(anchorMs);

  return (
    <div className="uptimeBar">
      <div className="uptimeBarLabel">
        <span>{label}</span>
        {coverage ? <span className="metaHint">{coverage}</span> : null}
      </div>
      <div className="uptimeBarTrack">
        {data.map((v, i) => {
          const tone = v >= 99.5 ? "ok" : v >= 98 ? "warn" : "err";
          const tooltip = validAnchor
            ? buildTooltip(v, anchorMs - (data.length - 1 - i) * 3_600_000)
            : `${v.toFixed(2)}%`;
          return (
            <button
              type="button"
              key={i}
              className={`uptimeSeg uptimeSeg--${tone}`}
              data-tooltip={tooltip}
              title={tooltip}
              aria-label={tooltip}
            />
          );
        })}
      </div>
    </div>
  );
}

function buildTooltip(pct: number, bucketEndMs: number): string {
  const start = new Date(bucketEndMs - 3_600_000);
  const end = new Date(bucketEndMs);
  // Always format in UTC + en-GB so the string is identical on server and
  // client. `undefined` locale + no timezone would fall back to the runtime
  // defaults — different between Node.js (server) and the user's mobile
  // browser, which causes a hydration mismatch on the data-tooltip / title
  // attributes that React's hydration check then bails on.
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  const day = start.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${day} ${fmt(start)}–${fmt(end)} UTC • ${pct.toFixed(2)}% uptime`;
}
