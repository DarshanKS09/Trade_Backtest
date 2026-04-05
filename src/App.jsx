import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import AssetSelector from "./components/AssetSelector";
import TimeframeSelector from "./components/TimeframeSelector";
import { runBacktest } from "./backtest/engine";
import { STRATEGY_OPTIONS, strategyRegistry } from "./backtest/strategies";
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
  const markersRef = useRef(null);
  const requestIdRef = useRef(0);

  const [market, setMarket] = useState(DEFAULT_MARKET);
  const [asset, setAsset] = useState(getAssetsForMarket(DEFAULT_MARKET)[0].value);
  const [interval, setInterval] = useState(DEFAULT_INTERVAL);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [strategyId, setStrategyId] = useState(STRATEGY_OPTIONS[0].value);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backtestResult, setBacktestResult] = useState(null);
  const [backtestError, setBacktestError] = useState("");
  const [backtestRunning, setBacktestRunning] = useState(false);

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
    const markers = createSeriesMarkers(series, []);

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = markers;

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
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !markersRef.current) {
      return;
    }

    seriesRef.current.setData(candles);
    markersRef.current.setMarkers([]);

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
      setBacktestResult(null);
      setBacktestError("");

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

  useEffect(() => {
    if (!markersRef.current) {
      return;
    }

    if (!backtestResult) {
      markersRef.current.setMarkers([]);
      return;
    }

    const markers = backtestResult.trades.flatMap((trade) => [
      {
        time: trade.entryTime,
        position: "belowBar",
        color: "#16a34a",
        shape: "arrowUp",
        text: "Buy",
      },
      {
        time: trade.exitTime,
        position: "aboveBar",
        color: trade.profit >= 0 ? "#2563eb" : "#dc2626",
        shape: "arrowDown",
        text: trade.profit >= 0 ? "Sell +" : "Sell -",
      },
    ]);

    markersRef.current.setMarkers(markers);
  }, [backtestResult]);

  function handleRunBacktest() {
    if (candles.length === 0) {
      setBacktestError("Load market data before running a backtest.");
      setBacktestResult(null);
      return;
    }

    const strategy = strategyRegistry[strategyId];

    if (!strategy) {
      setBacktestError("Selected strategy is not available.");
      setBacktestResult(null);
      return;
    }

    setBacktestRunning(true);
    setBacktestError("");

    try {
      const result = runBacktest(candles, strategy, {
        startingBalance: 10000,
        allocationPct: 1,
        feeRate: 0.001,
        slippageRate: 0.0005,
      });

      setBacktestResult(result);
    } catch (runError) {
      setBacktestResult(null);
      setBacktestError(runError.message || "Backtest failed.");
    } finally {
      setBacktestRunning(false);
    }
  }

  const marketLabel =
    MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market;
  const metrics = backtestResult?.metrics;

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
            <label className="control-field control-field-wide">
              <span>Strategy</span>
              <select
                value={strategyId}
                onChange={(event) => setStrategyId(event.target.value)}
              >
                {STRATEGY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="run-button"
              onClick={handleRunBacktest}
              disabled={loading || backtestRunning || candles.length === 0}
            >
              {backtestRunning ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </div>
      </header>

      <section className="results-panel">
        <div className="result-card">
          <span>Total Profit</span>
          <strong>{formatCurrency(metrics?.totalProfit ?? 0)}</strong>
        </div>
        <div className="result-card">
          <span>Win Rate</span>
          <strong>{formatPercent(metrics?.winRate ?? 0)}</strong>
        </div>
        <div className="result-card">
          <span>Total Trades</span>
          <strong>{metrics?.numberOfTrades ?? 0}</strong>
        </div>
        <div className="result-card">
          <span>Final Balance</span>
          <strong>{formatCurrency(metrics?.finalBalance ?? 10000)}</strong>
        </div>
        <div className="result-card">
          <span>Max Drawdown</span>
          <strong>{formatPercent(metrics?.maxDrawdown ?? 0)}</strong>
        </div>
        <div className="result-card">
          <span>Profit / Trade</span>
          <strong>{formatCurrency(metrics?.profitPerTrade ?? 0)}</strong>
        </div>
      </section>

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

          {!loading && !error && backtestError ? (
            <div className="chart-message error-message chart-message-lower">
              {backtestError}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

export default App;
