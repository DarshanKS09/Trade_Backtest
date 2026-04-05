import { formatCurrency, formatPercent } from "../utils/formatters";

function ResultsPanel({ metrics }) {
  return (
    <section className="results-panel">
      <MetricCard label="Total Profit" value={formatCurrency(metrics?.totalProfit ?? 0)} />
      <MetricCard label="Win Rate" value={formatPercent(metrics?.winRate ?? 0)} />
      <MetricCard label="Total Trades" value={metrics?.numberOfTrades ?? 0} />
      <MetricCard
        label="Final Balance"
        value={formatCurrency(metrics?.finalBalance ?? 10000)}
      />
      <MetricCard
        label="Max Drawdown"
        value={formatPercent(metrics?.maxDrawdown ?? 0)}
      />
      <MetricCard
        label="Profit / Trade"
        value={formatCurrency(metrics?.profitPerTrade ?? 0)}
      />
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="result-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ResultsPanel;
