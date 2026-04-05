const INTERVAL_OPTIONS = ["1m", "15m", "30m", "1h"];

function TimeframeSelector({ value, onChange }) {
  return (
    <label className="control-field">
      <span>Timeframe</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {INTERVAL_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default TimeframeSelector;
