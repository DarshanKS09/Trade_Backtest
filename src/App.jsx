import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart } from "lightweight-charts";
import AssetSelector from "./components/AssetSelector";
import TimeframeSelector from "./components/TimeframeSelector";
import { fetchMarketCandles } from "./lib/dataClient";
import { getAssetsForMarket, MARKET_OPTIONS } from "./lib/marketConfig";

const DEFAULT_MARKET = "crypto";
const DEFAULT_INTERVAL = "1m";
const DEFAULT_HOURS = 100;
const HOUR_OPTIONS = [10, 50, 100];

function App() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const requestIdRef = useRef(0);

  const [market, setMarket] = useState(DEFAULT_MARKET);
  const [asset, setAsset] = useState(getAssetsForMarket(DEFAULT_MARKET)[0].value);
  const [interval, setInterval] = useState(DEFAULT_INTERVAL);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const assets = getAssetsForMarket(market);

  useEffect(() => {
    if (!assets.some((item) => item.value === asset)) {
      setAsset(assets[0]?.value ?? "");
    }
  }, [market, asset]);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return undefined;
    }

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#1f2937",
      },
      grid: {
        vertLines: { color: "#e5e7eb" },
        horzLines: { color: "#e5e7eb" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 520,
      rightPriceScale: {
        borderColor: "#d1d5db",
      },
      timeScale: {
        borderColor: "#d1d5db",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (entry) {
        chart.applyOptions({
          width: entry.contentRect.width,
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) {
      return;
    }

    seriesRef.current.setData(candles);

    if (candles.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  useEffect(() => {
    if (!asset) {
      return undefined;
    }

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    async function loadCandles() {
      setLoading(true);
      setError("");
      setCandles([]);

      try {
        const data = await fetchMarketCandles({
          market,
          symbol: asset,
          interval,
          hours,
          signal: controller.signal,
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        setCandles(data);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (requestIdRef.current !== requestId) {
          return;
        }

        setError(fetchError.message || "Failed to fetch candles.");
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }

    loadCandles();

    return () => {
      controller.abort();
    };
  }, [market, asset, interval, hours]);

  const marketLabel =
    MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market;

  return (
    <main className="app-shell">
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
              marketOptions={MARKET_OPTIONS}
              assetOptions={assets}
              onMarketChange={setMarket}
              onAssetChange={setAsset}
            />
            <TimeframeSelector value={interval} onChange={setInterval} />
            <label className="control-field">
              <span>Range</span>
              <select
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
              >
                {HOUR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Last {option} hours
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <section className="chart-panel">
        <div className="chart-toolbar">
          <span>{marketLabel}</span>
          <span>{asset}</span>
          <span>{interval} interval</span>
          <span>{hours} hour range</span>
          <span>{candles.length} candles loaded</span>
        </div>

        <div className="chart-stage">
          <div ref={chartContainerRef} className="chart-container" />

          {loading ? (
            <div className="chart-message">Loading market data...</div>
          ) : null}

          {!loading && error ? (
            <div className="chart-message error-message">{error}</div>
          ) : null}

          {!loading && !error && candles.length === 0 ? (
            <div className="chart-message">No data available for this selection.</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default App;
