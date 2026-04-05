import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";

const REPLAY_RIGHT_PADDING = 20;

function ChartPanel({
  candles,
  visibleCandles,
  replayActive,
  isSelectingStart,
  backtestResult,
  loading,
  error,
  backtestError,
  toolbarItems,
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
      .filter((marker) => !replayActive || marker.time <= lastVisibleTime);

    markersRef.current.setMarkers(markers);
  }, [backtestResult, replayActive, visibleCandles]);

  return (
    <section className="chart-panel">
      <div className="chart-toolbar">
        {toolbarItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="chart-stage">
        <div ref={chartContainerRef} className="chart-container" />

        {loading ? <div className="chart-message">Loading market data...</div> : null}

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
  );
}

function clampIndex(value, length) {
  if (length === 0) {
    return 0;
  }

  return Math.min(Math.max(Math.floor(value), 0), length - 1);
}

export default ChartPanel;
