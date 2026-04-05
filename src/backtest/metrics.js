export function calculateMetrics({
  trades,
  equityCurve,
  startingBalance,
  finalBalance,
}) {
  const totalProfit = finalBalance - startingBalance;
  const numberOfTrades = trades.length;
  const wins = trades.filter((trade) => trade.profit > 0).length;
  const winRate = numberOfTrades > 0 ? (wins / numberOfTrades) * 100 : 0;
  const profitPerTrade = numberOfTrades > 0 ? totalProfit / numberOfTrades : 0;
  const maxDrawdown = calculateMaxDrawdown(equityCurve);

  return {
    totalProfit,
    finalBalance,
    numberOfTrades,
    winRate,
    maxDrawdown,
    profitPerTrade,
  };
}

function calculateMaxDrawdown(equityCurve) {
  let peak = 0;
  let maxDrawdown = 0;

  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);

    if (peak === 0) {
      continue;
    }

    const drawdown = ((peak - point.equity) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown;
}
