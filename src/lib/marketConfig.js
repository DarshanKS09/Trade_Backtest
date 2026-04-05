export const MARKET_OPTIONS = [
  { value: "crypto", label: "Crypto" },
  { value: "india", label: "India" },
  { value: "us", label: "US" },
];

const MARKET_ASSETS = {
  crypto: [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "AVAXUSDT",
    "DOTUSDT",
    "MATICUSDT",
  ],
  india: [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
    "HDFCBANK.NS",
    "ICICIBANK.NS",
    "SBIN.NS",
    "LT.NS",
    "ITC.NS",
    "AXISBANK.NS",
    "KOTAKBANK.NS",
  ],
  us: ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
};

export function getAssetsForMarket(market) {
  return (MARKET_ASSETS[market] ?? []).map((symbol) => ({
    value: symbol,
    label: symbol,
  }));
}
