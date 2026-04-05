import { memo } from "react";
import AssetSelector from "./AssetSelector";
import TimeframeSelector from "./TimeframeSelector";

const ControlsBar = memo(function ControlsBar({
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
  replayActive,
  isSelectingStart,
  isPlaying,
  speed,
  speedOptions,
  currentIndex,
  lastCandleIndex,
  onMarketChange,
  onAssetChange,
  onIntervalChange,
  onHoursChange,
  onStrategyChange,
  onRunBacktest,
  onSpeedChange,
  onNextCandle,
  onReplayButton,
  onResetReplay,
  onExitReplay,
}) {
  return (
    <section className="controls-bar">
      <div className="toolbar-group">
        <AssetSelector
          market={market}
          asset={asset}
          marketOptions={marketOptions}
          assetOptions={assets}
          onMarketChange={onMarketChange}
          onAssetChange={onAssetChange}
        />
        <TimeframeSelector value={interval} onChange={onIntervalChange} />
        <label className="control-field compact-field">
          <span>Range</span>
          <select value={hours} onChange={(event) => onHoursChange(Number(event.target.value))}>
            {hourOptions.map((option) => (
              <option key={option} value={option}>
                {option}h
              </option>
            ))}
          </select>
        </label>
        <label className="control-field compact-field control-field-wide">
          <span>Strategy</span>
          <select value={strategyId} onChange={(event) => onStrategyChange(event.target.value)}>
            {strategyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toolbar-group toolbar-group-right">
        <label className="control-field compact-field compact-speed">
          <span>Speed</span>
          <select
            value={speed}
            onChange={(event) => onSpeedChange(event.target.value)}
            disabled={candlesCount === 0}
          >
            {Object.keys(speedOptions).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="replay-chip">
          <span>Replay</span>
          <strong>{replayActive ? `${currentIndex}/${lastCandleIndex}` : "Full"}</strong>
        </div>

        <button
          type="button"
          className="toolbar-button primary"
          onClick={onRunBacktest}
          disabled={loading || backtestRunning || candlesCount === 0}
        >
          {backtestRunning ? "Running" : "Backtest"}
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onNextCandle}
          disabled={
            loading ||
            candlesCount === 0 ||
            !replayActive ||
            currentIndex >= lastCandleIndex
          }
        >
          Step
        </button>
        <button
          type="button"
          className={`toolbar-button ${isPlaying ? "active" : ""}`}
          onClick={onReplayButton}
          disabled={loading || candlesCount === 0}
        >
          {isSelectingStart ? "Pick Start" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={replayActive ? onResetReplay : onExitReplay}
          disabled={loading || candlesCount === 0}
        >
          {replayActive ? "Reset" : "Full"}
        </button>
        <button
          type="button"
          className="toolbar-button subtle"
          onClick={onExitReplay}
          disabled={loading || candlesCount === 0 || (!replayActive && !isSelectingStart)}
        >
          Exit
        </button>
      </div>
    </section>
  );
});

export default ControlsBar;
