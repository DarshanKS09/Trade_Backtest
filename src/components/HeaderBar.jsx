import { memo } from "react";

const HeaderBar = memo(function HeaderBar({
  marketLabel,
  asset,
  interval,
  hours,
  visibleCount,
  totalCount,
  replayLabel,
}) {
  return (
    <header className="top-shell">
      <div className="brand-block">
        <div className="brand-mark">TV</div>
        <div>
          <p className="brand-eyebrow">Trading Workspace</p>
          <h1 className="brand-title">{asset}</h1>
        </div>
      </div>

      <div className="market-strip">
        <StatPill label="Market" value={marketLabel} />
        <StatPill label="Timeframe" value={interval} />
        <StatPill label="Range" value={`${hours}h`} />
        <StatPill label="Visible" value={`${visibleCount}/${totalCount}`} />
        <StatPill label="Mode" value={replayLabel} />
      </div>
    </header>
  );
});

function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default HeaderBar;
