const BASE_URL = "https://api.binance.com/api/v3/klines";
const LIMIT = 1000;
const MAX_CANDLES = 10000;

const INTERVAL_TO_MS = {
  "1m": 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

export async function fetchCandles({ symbol, interval, hours, signal }) {
  const intervalMs = INTERVAL_TO_MS[interval];

  if (!intervalMs) {
    throw new Error(`Unsupported interval: ${interval}`);
  }

  const endTime = Date.now();
  const startTime = endTime - hours * 60 * 60 * 1000;
  const expectedCandles = Math.ceil((endTime - startTime) / intervalMs);

  if (expectedCandles > MAX_CANDLES) {
    throw new Error("Requested range is too large. Please choose a smaller range.");
  }

  const candles = [];
  const seenTimes = new Set();
  let cursor = startTime;

  while (cursor < endTime && candles.length < MAX_CANDLES) {
    const params = new URLSearchParams({
      symbol,
      interval,
      limit: String(LIMIT),
      startTime: String(cursor),
      endTime: String(endTime),
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`, { signal });

    if (!response.ok) {
      throw new Error(`Binance API request failed with status ${response.status}.`);
    }

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    for (const item of batch) {
      const openTime = Number(item[0]);

      if (openTime < startTime || openTime > endTime || seenTimes.has(openTime)) {
        continue;
      }

      seenTimes.add(openTime);
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

  candles.sort((left, right) => left.time - right.time);

  return candles;
}
