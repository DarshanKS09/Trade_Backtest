function ReplayControls({
  candlesCount,
  loading,
  replayActive,
  isSelectingStart,
  isPlaying,
  speed,
  speedOptions,
  startIndex,
  selectedStartTime,
  currentIndex,
  lastCandleIndex,
  onSpeedChange,
  onNextCandle,
  onReplayButton,
  onResetReplay,
  onExitReplay,
}) {
  return (
    <section className="replay-panel">
      <div className="replay-card replay-card-wide">
        <span>Replay Start Candle</span>
        <div className="replay-status">
          {isSelectingStart
            ? "Click any candle on the chart to choose the replay start."
            : replayActive
              ? `Replay starts at index ${startIndex} (${selectedStartTime}).`
              : "Full dataset is visible. Click Play, then pick a candle on the chart."}
        </div>
        <small>
          Selected candle time: {selectedStartTime} | Current replay index: {currentIndex}
        </small>
      </div>
      <div className="replay-card">
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
      </div>
      <div className="replay-card replay-actions">
        <button
          type="button"
          className="run-button"
          onClick={onNextCandle}
          disabled={
            loading ||
            candlesCount === 0 ||
            !replayActive ||
            currentIndex >= lastCandleIndex
          }
        >
          Next Candle
        </button>
        <button
          type="button"
          className="run-button secondary-button"
          onClick={onReplayButton}
          disabled={loading || candlesCount === 0}
        >
          {isSelectingStart ? "Select on Chart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="run-button secondary-button"
          onClick={replayActive ? onResetReplay : onExitReplay}
          disabled={loading || candlesCount === 0}
        >
          {replayActive ? "Reset" : "Show Full Chart"}
        </button>
        <button
          type="button"
          className="run-button secondary-button"
          onClick={onExitReplay}
          disabled={loading || candlesCount === 0 || (!replayActive && !isSelectingStart)}
        >
          Exit Replay
        </button>
      </div>
    </section>
  );
}

export default ReplayControls;
