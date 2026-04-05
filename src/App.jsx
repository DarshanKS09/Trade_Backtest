import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart } from "lightweight-charts";
import TimeframeSelector from "./components/TimeframeSelector";
import { fetchCandles } from "./lib/binance";

const DEFAULT_INTERVAL = "1m";
const DEFAULT_HOURS = 100;
const HOUR_OPTIONS = [10, 50, 100];

function App() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const requestIdRef = useRef(0);

  const [interval, setInterval] = useState(DEFAULT_INTERVAL);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    chartRef.current.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    async function loadCandles() {
      setLoading(true);
      setError("");
      setCandles([]);

      try {
        const data = await fetchCandles({
          symbol: "BTCUSDT",
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

        setCandles([]);
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
  }, [interval, hours]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Binance BTCUSDT</p>
        <div className="header-row">
          <div>
            <h1>Dynamic Candlestick Chart</h1>
            <p className="subheading">
              Fetches live Binance klines for the selected timeframe and recent
              hour range.
            </p>
          </div>
          <div className="controls">
            <TimeframeSelector value={interval} onChange={setInterval} />
            <label className="control-field">
              <span>Range</span>
              <select
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
              >
                {HOUR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Last {option}h
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <section className="chart-panel">
        <div className="chart-toolbar">
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
        </div>
      </section>
    </main>
  );
}

export default App;
