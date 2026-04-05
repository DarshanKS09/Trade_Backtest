import { memo } from "react";
import { formatCurrency, formatTimestamp } from "../utils/formatters";

const TradeLogPanel = memo(function TradeLogPanel({ trades = [] }) {
  return (
    <section className="trade-log-shell">
      <div className="trade-log-header">
        <span>Trade Log</span>
        <strong>{trades.length} trades</strong>
      </div>

      <div className="trade-log-table-wrap">
        <table className="trade-log-table">
          <thead>
            <tr>
              <th>Entry</th>
              <th>Exit</th>
              <th>Entry Price</th>
              <th>Exit Price</th>
              <th>P/L</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-log">
                  Run a backtest to populate trade history.
                </td>
              </tr>
            ) : (
              trades.slice(-20).reverse().map((trade) => (
                <tr key={`${trade.entryTime}-${trade.exitTime}`}>
                  <td>{formatTimestamp(trade.entryTime)}</td>
                  <td>{formatTimestamp(trade.exitTime)}</td>
                  <td>{trade.entryPrice.toFixed(2)}</td>
                  <td>{trade.exitPrice.toFixed(2)}</td>
                  <td className={trade.profit >= 0 ? "profit-cell" : "loss-cell"}>
                    {formatCurrency(trade.profit)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
});

export default TradeLogPanel;
