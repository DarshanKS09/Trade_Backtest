const BINANCE_LIMIT = 1000;
const MAX_CANDLES = 5000;
const INTERVAL_TO_MS = {
  "1m": 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

const YAHOO_INTERVAL_MAP = {
  "1m": "1m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
};

const YAHOO_CHUNK_MS = 7 * 24 * 60 * 60 * 1000;

function buildSourceUrl(proxyPath, externalUrl) {
  return import.meta.env.DEV ? proxyPath : externalUrl;
}

function normalizeCandles(candles) {
  const byTime = new Map();

  for (const candle of candles) {
    if (
      !Number.isFinite(candle.time) ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close)
    ) {
      continue;
    }

    byTime.set(candle.time, candle);
  }

  return [...byTime.values()]
    .sort((left, right) => left.time - right.time)
    .slice(-MAX_CANDLES);
}

export async function fetchMarketCandles({ market, symbol, interval, hours, signal }) {
  const intervalMs = INTERVAL_TO_MS[interval];

  if (!intervalMs) {
    throw new Error(`Unsupported interval: ${interval}`);
  }

  const endTime = Date.now();
  const requestedStartTime = endTime - hours * 60 * 60 * 1000;
  const maxWindowStartTime = endTime - MAX_CANDLES * intervalMs;
  const startTime = Math.max(requestedStartTime, maxWindowStartTime);

  if (market === "crypto") {
    return fetchBinanceCandles({ symbol, interval, startTime, endTime, intervalMs, signal });
  }

  return fetchYahooCandles({ symbol, interval, startTime, endTime, signal });
}

async function fetchBinanceCandles({
  symbol,
  interval,
  startTime,
  endTime,
  intervalMs,
  signal,
}) {
  const candles = [];
  let cursor = startTime;

  while (cursor < endTime && candles.length < MAX_CANDLES) {
    const params = new URLSearchParams({
      symbol,
      interval,
      limit: String(BINANCE_LIMIT),
      startTime: String(cursor),
      endTime: String(endTime),
    });

    const url = buildSourceUrl(
      `/api/binance/api/v3/klines?${params.toString()}`,
      `https://api.binance.com/api/v3/klines?${params.toString()}`
    );

    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error(`Binance request failed with status ${response.status}.`);
    }

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    for (const item of batch) {
      const openTime = Number(item[0]);

      candles.push({
        time: Math.floor(openTime / 1000),
        open: Number(item[1]),
        high: Number(item[2]),
        low: Number(item[3]),
        close: Number(item[4]),
      });
    }

    const lastOpenTime = Number(batch[batch.length - 1][0]);
    const nextCursor = lastOpenTime + intervalMs;

    if (nextCursor <= cursor) {
      break;
    }

    cursor = nextCursor;
  }

  return normalizeCandles(candles);
}

async function fetchYahooCandles({ symbol, interval, startTime, endTime, signal }) {
  const mappedInterval = YAHOO_INTERVAL_MAP[interval];

  if (!mappedInterval) {
    throw new Error(`Unsupported Yahoo interval: ${interval}`);
  }

  const candles = [];
  let cursor = startTime;

  while (cursor < endTime && candles.length < MAX_CANDLES) {
    const chunkEndTime = Math.min(cursor + YAHOO_CHUNK_MS, endTime);
    const params = new URLSearchParams({
      period1: String(Math.floor(cursor / 1000)),
      period2: String(Math.ceil(chunkEndTime / 1000)),
      interval: mappedInterval,
      includePrePost: "false",
      events: "div,splits",
    });

    const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`;
    const url = buildSourceUrl(
      `/api/yahoo${path}`,
      `https://query1.finance.yahoo.com${path}`
    );

    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error(`Yahoo request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];

    if (!result || !quote || timestamps.length === 0) {
      cursor = chunkEndTime + 1000;
      continue;
    }

    for (let index = 0; index < timestamps.length; index += 1) {
      candles.push({
        time: Number(timestamps[index]),
        open: Number(quote.open?.[index]),
        high: Number(quote.high?.[index]),
        low: Number(quote.low?.[index]),
        close: Number(quote.close?.[index]),
      });
    }

    cursor = chunkEndTime + 1000;
  }

  return normalizeCandles(candles);
}
