import { useEffect, useRef, useState } from "react";
import ResultsPanel from "./components/ResultsPanel";
import HeaderControls from "./components/HeaderControls";
import ReplayControls from "./components/ReplayControls";
import ChartPanel from "./components/ChartPanel";
import { runBacktest } from "./backtest/engine";
import { STRATEGY_OPTIONS, strategyRegistry } from "./backtest/strategies";
import { fetchMarketCandles } from "./lib/dataClient";
import { getAssetsForMarket, MARKET_OPTIONS } from "./lib/marketConfig";
import { formatTimestamp } from "./utils/formatters";

const DEFAULT_MARKET = "crypto";
const DEFAULT_INTERVAL = "1m";
const DEFAULT_HOURS = 100;
const HOUR_OPTIONS = [10, 50, 100];
const DEFAULT_REPLAY_SPEED = "1x";
const REPLAY_SPEED_OPTIONS = {
  "1x": 1000,
  "5x": 250,
  "10x": 100,
};

function App() {
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
    if (!asset) {
      return undefined;
    }

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    async function loadCandles() {
      resetViewState();
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
    if (candles.length === 0) {
      resetViewState();
      return;
    }

    setStartIndex(0);
    setCurrentIndex(lastCandleIndex);
    setIsPlaying(false);
    setReplayActive(false);
    setIsSelectingStart(false);
  }, [candles, lastCandleIndex]);

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
  }, [isPlaying, replayActive, speed, lastCandleIndex, candles.length, safeCurrentIndex]);

  function resetViewState() {
    setStartIndex(0);
    setCurrentIndex(0);
    setIsPlaying(false);
    setReplayActive(false);
    setIsSelectingStart(false);
  }

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

  function handleSelectReplayStart(selectedIndex) {
    setStartIndex(selectedIndex);
    setCurrentIndex(selectedIndex);
    setReplayActive(true);
    setIsSelectingStart(false);
    setIsPlaying(false);
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
  const selectedStartTime =
    candles[startIndex]?.time != null ? formatTimestamp(candles[startIndex].time) : "N/A";

  return (
    <main className="app-shell">
      <HeaderControls
        market={market}
        asset={asset}
        assets={assets}
        marketOptions={MARKET_OPTIONS}
        interval={interval}
        hours={hours}
        hourOptions={HOUR_OPTIONS}
        strategyId={strategyId}
        strategyOptions={STRATEGY_OPTIONS}
        loading={loading}
        backtestRunning={backtestRunning}
        candlesCount={candles.length}
        onMarketChange={setMarket}
        onAssetChange={setAsset}
        onIntervalChange={setInterval}
        onHoursChange={setHours}
        onStrategyChange={setStrategyId}
        onRunBacktest={handleRunBacktest}
      />

      <ResultsPanel metrics={metrics} />

      <ReplayControls
        candlesCount={candles.length}
        loading={loading}
        replayActive={replayActive}
        isSelectingStart={isSelectingStart}
        isPlaying={isPlaying}
        speed={speed}
        speedOptions={REPLAY_SPEED_OPTIONS}
        startIndex={startIndex}
        selectedStartTime={selectedStartTime}
        currentIndex={safeCurrentIndex}
        lastCandleIndex={lastCandleIndex}
        onSpeedChange={setSpeed}
        onNextCandle={handleNextCandle}
        onReplayButton={handleReplayButton}
        onResetReplay={handleResetReplay}
        onExitReplay={handleExitReplay}
      />

      <ChartPanel
        candles={candles}
        visibleCandles={visibleCandles}
        replayActive={replayActive}
        isSelectingStart={isSelectingStart}
        backtestResult={backtestResult}
        loading={loading}
        error={error}
        backtestError={backtestError}
        toolbarItems={[
          marketLabel,
          asset,
          `${interval} interval`,
          `${hours} hour range`,
          `${visibleCandles.length} visible / ${candles.length} loaded`,
          replayActive ? `Replay index ${safeCurrentIndex}` : "Full chart mode",
        ]}
        onSelectStart={handleSelectReplayStart}
      />
    </main>
  );
}

export default App;
