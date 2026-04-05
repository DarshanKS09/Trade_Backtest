import AssetSelector from "./AssetSelector";
import TimeframeSelector from "./TimeframeSelector";

function HeaderControls({
  market,
  asset,
  assets,
  marketOptions,
  interval,
  hours,
  hourOptions,
  strategyId,
  strategyOptions,
  loading,
  backtestRunning,
  candlesCount,
  onMarketChange,
  onAssetChange,
  onIntervalChange,
  onHoursChange,
  onStrategyChange,
  onRunBacktest,
}) {
  return (
    <header className="app-header">
      <p className="eyebrow">Multi-Asset Trading Platform</p>
      <div className="header-row">
        <div>
          <h1>Unified Candlestick Chart</h1>
          <p className="subheading">
            Switch between crypto, Indian equities, and US stocks without
            leaving the same chart workflow.
          </p>
        </div>
        <div className="controls">
          <AssetSelector
            market={market}
            asset={asset}
            marketOptions={marketOptions}
            assetOptions={assets}
            onMarketChange={onMarketChange}
            onAssetChange={onAssetChange}
          />
          <TimeframeSelector value={interval} onChange={onIntervalChange} />
          <label className="control-field">
            <span>Range</span>
            <select value={hours} onChange={(event) => onHoursChange(Number(event.target.value))}>
              {hourOptions.map((option) => (
                <option key={option} value={option}>
                  Last {option} hours
                </option>
              ))}
            </select>
          </label>
          <label className="control-field control-field-wide">
            <span>Strategy</span>
            <select value={strategyId} onChange={(event) => onStrategyChange(event.target.value)}>
              {strategyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="run-button"
            onClick={onRunBacktest}
            disabled={loading || backtestRunning || candlesCount === 0}
          >
            {backtestRunning ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </div>
    </header>
  );
}

export default HeaderControls;
