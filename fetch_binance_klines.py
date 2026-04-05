import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen


BASE_URL = "https://api.binance.com/api/v3/klines"
SYMBOL = "BTCUSDT"
INTERVAL = "1m"
LIMIT = 1000
OUTPUT_FILE = Path("data.json")


def fetch_klines(symbol: str, interval: str, limit: int) -> list[dict]:
    query = urlencode(
        {
            "symbol": symbol,
            "interval": interval,
            "limit": limit,
        }
    )
    url = f"{BASE_URL}?{query}"

    try:
        with urlopen(url) as response:
            raw_klines = json.load(response)
    except HTTPError as error:
        raise RuntimeError(f"Binance API returned HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(f"Failed to reach Binance API: {error.reason}") from error

    return [
        {
            "time": int(kline[0]),
            "open": float(kline[1]),
            "high": float(kline[2]),
            "low": float(kline[3]),
            "close": float(kline[4]),
            "volume": float(kline[5]),
        }
        for kline in raw_klines
    ]


def main() -> None:
    klines = fetch_klines(SYMBOL, INTERVAL, LIMIT)
    OUTPUT_FILE.write_text(json.dumps(klines, indent=2), encoding="utf-8")
    print(f"Saved {len(klines)} candles to {OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()
