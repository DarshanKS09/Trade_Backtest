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
const DEFAULT_REPLAY_SPEED = "1x";
const REPLAY_RIGHT_PADDING = 20;
const REPLAY_SPEED_OPTIONS = {
  "1x": 1000,
  "5x": 250,
  "10x": 100,
};

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
  const [startIndex, setStartIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(DEFAULT_REPLAY_SPEED);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayActive, setReplayActive] = useState(false);
  const [isSelectingStart, setIsSelectingStart] = useState(false);

  const assets = getAssetsForMarket(market);
  const lastCandleIndex = Math.max(candles.length - 1, 0);
  const safeCurrentIndex = Math.min(Math.max(currentIndex, 0), lastCandleIndex);
  const visibleCandles = replayActive
    ? candles.slice(0, safeCurrentIndex + 1)
    : candles;

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
    if (!chartRef.current) {
      return undefined;
    }

    function handleChartClick(param) {
      if (!isSelectingStart || candles.length === 0 || param.logical == null) {
        return;
      }

      const selectedIndex = clampIndex(Math.round(param.logical), candles.length);

      setStartIndex(selectedIndex);
      setCurrentIndex(selectedIndex);
      setReplayActive(true);
      setIsSelectingStart(false);
      setIsPlaying(false);
    }

    chartRef.current.subscribeClick(handleChartClick);

    return () => {
      chartRef.current?.unsubscribeClick(handleChartClick);
    };
  }, [isSelectingStart, candles.length]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !markersRef.current) {
      return;
    }

    seriesRef.current.setData(visibleCandles);
    markersRef.current.setMarkers([]);

    if (visibleCandles.length > 0) {
      if (replayActive) {
        const visibleCount = visibleCandles.length;
        const from = Math.max(0, visibleCount - 150);
        const to = visibleCount - 1 + REPLAY_RIGHT_PADDING;

        chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
      } else {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [candles, safeCurrentIndex, replayActive]);

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
      setStartIndex(0);
      setCurrentIndex(0);
      setIsPlaying(false);
      setReplayActive(false);
      setIsSelectingStart(false);

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
    if (candles.length === 0) {
      setStartIndex(0);
      setCurrentIndex(0);
      setIsPlaying(false);
      setReplayActive(false);
      setIsSelectingStart(false);
      return;
    }

    setStartIndex(0);
    setCurrentIndex(lastCandleIndex);
    setIsPlaying(false);
    setReplayActive(false);
    setIsSelectingStart(false);
  }, [candles, lastCandleIndex]);

  useEffect(() => {
    if (!markersRef.current) {
      return;
    }

    if (!backtestResult) {
      markersRef.current.setMarkers([]);
      return;
    }

    const markers = backtestResult.trades
      .flatMap((trade) => [
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
      ])
      .filter(
        (marker) =>
          !replayActive || marker.time <= (visibleCandles.at(-1)?.time ?? 0)
      );

    markersRef.current.setMarkers(markers);
  }, [backtestResult, safeCurrentIndex, candles, replayActive]);

  useEffect(() => {
    if (!isPlaying || !replayActive || candles.length === 0) {
      return undefined;
    }

    if (safeCurrentIndex >= lastCandleIndex) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((previous) => {
        if (previous >= lastCandleIndex) {
          window.clearInterval(timer);
          setIsPlaying(false);
          return previous;
        }

        return previous + 1;
      });
    }, REPLAY_SPEED_OPTIONS[speed]);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    isPlaying,
    replayActive,
    speed,
    lastCandleIndex,
    candles.length,
    safeCurrentIndex,
  ]);

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

  function handleNextCandle() {
    if (candles.length === 0 || !replayActive) {
      return;
    }

    setCurrentIndex((previous) => Math.min(previous + 1, lastCandleIndex));
  }

  function handleResetReplay() {
    setCurrentIndex(startIndex);
    setIsPlaying(false);
  }

  function handleReplayButton() {
    if (candles.length === 0) {
      return;
    }

    if (!replayActive) {
      setIsSelectingStart(true);
      setIsPlaying(false);
      return;
    }

    if (safeCurrentIndex >= lastCandleIndex) {
      return;
    }

    setIsPlaying((previous) => !previous);
  }

  function handleExitReplay() {
    setReplayActive(false);
    setIsSelectingStart(false);
    setIsPlaying(false);
    setCurrentIndex(lastCandleIndex);
  }

  const marketLabel =
    MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market;
  const metrics = backtestResult?.metrics;
  const visibleCandleCount = visibleCandles.length;
  const selectedStartTime =
    candles[startIndex]?.time != null ? formatTimestamp(candles[startIndex].time) : "N/A";

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
          <small>Selected candle time: {selectedStartTime}</small>
        </div>
        <div className="replay-card">
          <span>Speed</span>
          <select
            value={speed}
            onChange={(event) => setSpeed(event.target.value)}
            disabled={candles.length === 0}
          >
            {Object.keys(REPLAY_SPEED_OPTIONS).map((option) => (
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
            onClick={handleNextCandle}
            disabled={
              loading ||
              candles.length === 0 ||
              !replayActive ||
              safeCurrentIndex >= lastCandleIndex
            }
          >
            Next Candle
          </button>
          <button
            type="button"
            className="run-button secondary-button"
            onClick={handleReplayButton}
            disabled={loading || candles.length === 0}
          >
            {isSelectingStart ? "Select on Chart" : isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="run-button secondary-button"
            onClick={replayActive ? handleResetReplay : handleExitReplay}
            disabled={loading || candles.length === 0}
          >
            {replayActive ? "Reset" : "Show Full Chart"}
          </button>
          <button
            type="button"
            className="run-button secondary-button"
            onClick={handleExitReplay}
            disabled={loading || candles.length === 0 || (!replayActive && !isSelectingStart)}
          >
            Exit Replay
          </button>
        </div>
      </section>

      <section className="chart-panel">
        <div className="chart-toolbar">
          <span>{marketLabel}</span>
          <span>{asset}</span>
          <span>{interval} interval</span>
          <span>{hours} hour range</span>
          <span>{visibleCandleCount} visible / {candles.length} loaded</span>
          <span>{replayActive ? `Replay index ${safeCurrentIndex}` : "Full chart mode"}</span>
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

function clampIndex(value, length) {
  if (length === 0) {
    return 0;
  }

  return Math.min(Math.max(Math.floor(value), 0), length - 1);
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

function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

export default App;
