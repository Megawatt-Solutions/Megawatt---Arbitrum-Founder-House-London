export function HowView() {
  return (
    <>
      <h1>How it works</h1>
      <p className="sc-sub">
        A free daily forecasting game on the Slovenian day-ahead electricity market. No purchase necessary — ever.
      </p>

      <div className="sc-how-grid">
        <div className="panel sc-panel">
          <h2 className="sc-how-h">THE DAILY QUESTION</h2>
          <p>
            Every day, one question: <b>which band will tomorrow&apos;s daily price spread land in?</b> The spread is
            the maximum minus the minimum hourly price for the delivery day, in €/MWh, on the SI bidding zone
            day-ahead auction.
          </p>
          <p style={{ marginTop: 10 }}>
            Five bands, recalibrated every Monday from trailing 60-day quintiles, so each band carries roughly 20%
            base probability. Your edge is reading the weather, solar output and demand — pure skill.
          </p>
        </div>

        <div className="panel sc-panel">
          <h2 className="sc-how-h">THE CLOCK</h2>
          <div className="sc-timeline">
            <div className="t"><b>15:00 CET</b><span>Forecasts open, two days before delivery.</span></div>
            <div className="t"><b>11:45 CET</b><span>Forecasts close — before the 12:00 SDAC gate, so no outcome information exists at close.</span></div>
            <div className="t"><b>~13:00 CET</b><span>Auction results publish.</span></div>
            <div className="t"><b>15:00 CET</b><span>Settlement runs; published prices are aggregated to hourly means and are final.</span></div>
          </div>
        </div>

        <div className="panel sc-panel">
          <h2 className="sc-how-h">SCORING</h2>
          <ul>
            <li><b>10 points</b> for the correct band.</li>
            <li>Streak multiplier: ×1.5 on day 2, growing to a <b>×3 cap</b> from day 5. Wrong pick or skipped day resets it.</li>
            <li>Optional exact-spread guess is the <b>tiebreaker</b> — lowest cumulative absolute error wins ties.</li>
            <li>Weekly and season leaderboards.</li>
          </ul>
        </div>

        <div className="panel sc-panel">
          <h2 className="sc-how-h">VERIFIED PLAY · XRPL</h2>
          <p>
            Anyone plays instantly with an email. Connecting an XRPL wallet (Xaman) makes you <b>verified</b>:
            required for the verified leaderboard and prize eligibility.
          </p>
          <ul style={{ marginTop: 10 }}>
            <li>Daily 1-drop signature to the platform anchor carries a salted hash of your forecast — a tamper-proof public commitment on XRPL mainnet.</li>
            <li>After settlement we reveal the salts, so anyone can verify every commitment.</li>
            <li>A weekly Merkle anchor transaction covers all players, including email-only.</li>
          </ul>
        </div>

        <div className="panel sc-panel">
          <h2 className="sc-how-h">PRIZES</h2>
          <p>
            Top verified ranks occasionally receive sponsored <b>RLUSD promotional awards</b> (RLUSD needs a
            trustline — one more real on-chain step) and future <b>protocol boosts</b>. Prizes are marketing awards
            from the sponsoring entity. They are never a return on a payment, because there is no payment: entry is
            free in every configuration and the platform has no way to accept money from players.
          </p>
        </div>

        <div className="panel sc-panel">
          <h2 className="sc-how-h">FAIRNESS &amp; AUDIT</h2>
          <ul>
            <li>Settlement uses the officially published day-ahead prices (ENTSO-E A44, SI zone) — final, no discretion.</li>
            <li>Since the market moved to 15-minute products, published values are aggregated to hourly means before computing the spread. Negative prices are handled naturally by max − min.</li>
            <li>Every delivery day&apos;s raw values, aggregation, spread, band and commit-reveal record are public in the archive.</li>
          </ul>
        </div>
      </div>

      <div className="panel sc-panel" style={{ marginTop: 16 }}>
        <h2 className="sc-how-h">THE FINE PRINT</h2>
        <p className="sc-notice">
          Spreadcast is a free, skill-based promotional competition. 18+. No purchase necessary; no entry fee,
          deposits or staking exist anywhere in the product. Prizes are promotional awards from the sponsoring
          entity (final entity details pending company registration). Wallet addresses are treated as personal data
          under GDPR. This is a prototype — terms, privacy policy and prize tax handling land with the production
          release.
        </p>
      </div>
    </>
  );
}
