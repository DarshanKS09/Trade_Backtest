import { memo, useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
} from "lightweight-charts";

const REPLAY_RIGHT_PADDING = 20;

const ChartContainer = memo(function ChartContainer({
  candles,
  visibleCandles,
  replayActive,
  isSelectingStart,
  backtestResult,
  loading,
  error,
  backtestError,
  onSelectStart,
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markersRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return undefined;
    }

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "#0e1117" },
        textColor: "#9aa4b2",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(138, 150, 163, 0.35)",
          width: 1,
          labelBackgroundColor: "#1b2230",
        },
        horzLine: {
          color: "rgba(138, 150, 163, 0.35)",
          width: 1,
          labelBackgroundColor: "#1b2230",
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 640,
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series, []);

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

      onSelectStart(clampIndex(Math.round(param.logical), candles.length));
    }

    chartRef.current.subscribeClick(handleChartClick);

    return () => {
      chartRef.current?.unsubscribeClick(handleChartClick);
    };
  }, [candles.length, isSelectingStart, onSelectStart]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) {
      return;
    }

    seriesRef.current.setData(visibleCandles);

    if (visibleCandles.length === 0) {
      return;
    }

    if (replayActive) {
      const visibleCount = visibleCandles.length;
      const from = Math.max(0, visibleCount - 150);
      const to = visibleCount - 1 + REPLAY_RIGHT_PADDING;

      chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
      return;
    }

    chartRef.current.timeScale().fitContent();
  }, [visibleCandles, replayActive]);

  useEffect(() => {
    if (!markersRef.current) {
      return;
    }

    if (!backtestResult) {
      markersRef.current.setMarkers([]);
      return;
    }

    const lastVisibleTime = visibleCandles.at(-1)?.time ?? 0;
    const markers = backtestResult.trades
      .flatMap((trade) => [
        {
          time: trade.entryTime,
          position: "belowBar",
          color: "#22c55e",
          shape: "arrowUp",
          text: "Buy",
        },
        {
          time: trade.exitTime,
          position: "aboveBar",
          color: trade.profit >= 0 ? "#38bdf8" : "#ef4444",
          shape: "arrowDown",
          text: trade.profit >= 0 ? "Exit +" : "Exit -",
        },
      ])
      .filter((marker) => !replayActive || marker.time <= lastVisibleTime);

    markersRef.current.setMarkers(markers);
  }, [backtestResult, replayActive, visibleCandles]);

  return (
    <section className="chart-shell">
      <div className="chart-surface">
        <div ref={chartContainerRef} className="chart-container" />

        {loading ? <div className="floating-badge">Loading market data...</div> : null}
        {!loading && error ? <div className="floating-badge error-badge">{error}</div> : null}
        {!loading && !error && candles.length === 0 ? (
          <div className="floating-badge">No data available for this selection.</div>
        ) : null}
        {!loading && !error && backtestError ? (
          <div className="floating-badge error-badge lower-badge">{backtestError}</div>
        ) : null}
        {isSelectingStart ? (
          <div className="selection-hint">Click a candle on the chart to set replay start</div>
        ) : null}
      </div>
    </section>
  );
});

function clampIndex(value, length) {
  if (length === 0) {
    return 0;
  }

  return Math.min(Math.max(Math.floor(value), 0), length - 1);
}

export default ChartContainer;
