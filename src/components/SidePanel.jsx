import { memo } from "react";
import { formatCurrency, formatPercent } from "../utils/formatters";

const SidePanel = memo(function SidePanel({
  metrics,
  strategyLabel,
  replayActive,
  isSelectingStart,
  isPlaying,
  selectedStartTime,
}) {
  return (
    <aside className="side-panel">
      <div className="panel-card">
        <div className="panel-header">
          <span>Backtest</span>
          <strong>{strategyLabel}</strong>
        </div>
        <MetricRow label="Total Profit" value={formatCurrency(metrics?.totalProfit ?? 0)} />
        <MetricRow label="Win Rate" value={formatPercent(metrics?.winRate ?? 0)} />
        <MetricRow label="Trades" value={metrics?.numberOfTrades ?? 0} />
        <MetricRow label="Final Balance" value={formatCurrency(metrics?.finalBalance ?? 10000)} />
        <MetricRow label="Max Drawdown" value={formatPercent(metrics?.maxDrawdown ?? 0)} />
        <MetricRow
          label="Profit / Trade"
          value={formatCurrency(metrics?.profitPerTrade ?? 0)}
        />
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <span>Replay</span>
          <strong>{replayActive ? (isPlaying ? "Playing" : "Paused") : "Full View"}</strong>
        </div>
        <StatusLine
          label="Start"
          value={selectedStartTime}
        />
        <StatusLine
          label="Selection"
          value={isSelectingStart ? "Pick candle on chart" : "Locked"}
        />
      </div>
    </aside>
  );
});

function MetricRow({ label, value }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusLine({ label, value }) {
  return (
    <div className="status-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default SidePanel;
