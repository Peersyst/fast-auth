export default function StatusUnavailable() {
  return (
    <section className="statusBanner">
      <div className="container">
        <div className="statusBannerLeft">
          <span className="statusBannerDot statusBannerDot--warn" />
          <div>
            <h1>Live status unavailable</h1>
            <p>
              The metrics dashboard is unreachable. Numbers will appear here as soon as the upstream
              endpoint comes back online.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
