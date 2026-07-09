import type { StatusData } from "@/lib/status";
import { fmtN, fmtPct, relativeTime } from "./format";

export default function StatusBanner({ data }: { data: StatusData }) {
  const ok = data.summary.overall === "operational";
  return (
    <section className="statusBanner">
      <div className="container">
        <div className="statusBannerLeft">
          <span className={`statusBannerDot statusBannerDot--${ok ? "ok" : "warn"}`} />
          <div>
            <h1>{ok ? "All systems operational" : "Degraded performance"}</h1>
            <p>
              FastAuth metrics on NEAR mainnet · Updated {relativeTime(data.generatedAt)} · auto-refresh{" "}
              {data.revalidateSeconds}s
            </p>
          </div>
        </div>
        <div className="statusBannerRight">
          <BannerStat label="FastAuth · 24h" value={fmtPct(data.summary.fastAuthSuccess24h, 0)} ok />
          <BannerStat label="MPC · 24h" value={fmtPct(data.summary.mpcSuccess24h, 0)} ok />
          <BannerStat label="Sign-events" value={fmtN(data.summary.txLast24h)} />
          <BannerStat label="Active users" value={fmtN(data.summary.activeUsers24h)} />
          <BannerStat label="Accounts" value={fmtN(data.summary.accountsTotal)} />
        </div>
      </div>
    </section>
  );
}

function BannerStat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className={`bannerStat${ok ? " bannerStat--ok" : ""}`}>
      <span className="bannerStatLabel">{label}</span>
      <span className="bannerStatValue">{value}</span>
    </div>
  );
}
