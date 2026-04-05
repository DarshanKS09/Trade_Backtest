function AssetSelector({
  market,
  asset,
  marketOptions,
  assetOptions,
  onMarketChange,
  onAssetChange,
}) {
  return (
    <>
      <label className="control-field">
        <span>Market</span>
        <select value={market} onChange={(event) => onMarketChange(event.target.value)}>
          {marketOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="control-field control-field-wide">
        <span>Asset</span>
        <select value={asset} onChange={(event) => onAssetChange(event.target.value)}>
          {assetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export default AssetSelector;
