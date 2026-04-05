import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart } from "lightweight-charts";

function App() {
  const chartContainerRef = useRef(null);
  const [candles, setCandles] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadCandles() {
      const response = await fetch("/data.json");
      const rawData = await response.json();

      if (ignore) {
        return;
      }

      const formattedData = rawData.map((item) => ({
        time: Math.floor(item.time / 1000),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }));

      setCandles(formattedData);
    }

    loadCandles();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) {
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

    series.setData(candles);
    chart.timeScale().fitContent();

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
    };
  }, [candles]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Binance BTCUSDT</p>
        <h1>1 Minute Candlestick Chart</h1>
      </header>
      <section className="chart-panel">
        <div ref={chartContainerRef} className="chart-container" />
      </section>
    </main>
  );
}

export default App;
