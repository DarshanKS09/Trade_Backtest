import { calculateMetrics } from "./metrics";

const DEFAULT_OPTIONS = {
  startingBalance: 10000,
  allocationPct: 1,
  feeRate: 0.001,
  slippageRate: 0,
  stopLossPct: null,
  takeProfitPct: null,
};

const SIGNALS = {
  BUY: "BUY",
  SELL: "SELL",
  HOLD: "HOLD",
};

export function runBacktest(candles, strategy, options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const preparedStrategy = strategy.prepare ? strategy.prepare(candles) : {};
  const warmup = Math.max(strategy.lookback ?? 1, 1);

  let balance = settings.startingBalance;
  let position = null;
  const trades = [];
  const equityCurve = [];

  for (let index = warmup; index < candles.length; index += 1) {
    const candle = candles[index];
    const signal = strategy.getSignal({
      index,
      candles,
      pastCandles: candles.slice(0, index),
      indicators: preparedStrategy,
      position,
    });

    if (position) {
      const managedExit = getManagedExitPrice(position, candle, settings);

      if (managedExit !== null) {
        const closedTrade = closePosition({
          position,
          candle,
          exitPrice: managedExit,
          balance,
          feeRate: settings.feeRate,
          slippageRate: settings.slippageRate,
        });

        balance = closedTrade.balance;
        trades.push(closedTrade.trade);
        position = null;
      }
    }

    if (signal === SIGNALS.BUY && !position) {
      const allocatedBalance = balance * settings.allocationPct;

      if (allocatedBalance > 0) {
        const nextPosition = openPosition({
          candle,
          allocatedBalance,
          balance,
          feeRate: settings.feeRate,
          slippageRate: settings.slippageRate,
        });

        balance = nextPosition.balance;
        position = nextPosition.position;
      }
    } else if (signal === SIGNALS.SELL && position) {
      const closedTrade = closePosition({
        position,
        candle,
        exitPrice: candle.open,
        balance,
        feeRate: settings.feeRate,
        slippageRate: settings.slippageRate,
      });

      balance = closedTrade.balance;
      trades.push(closedTrade.trade);
      position = null;
    }

    equityCurve.push({
      time: candle.time,
      equity: markToMarket(balance, position, candle.close, settings.feeRate),
    });
  }

  if (position && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const closedTrade = closePosition({
      position,
      candle: lastCandle,
      exitPrice: lastCandle.close,
      balance,
      feeRate: settings.feeRate,
      slippageRate: settings.slippageRate,
    });

    balance = closedTrade.balance;
    trades.push(closedTrade.trade);
    equityCurve.push({
      time: lastCandle.time,
      equity: balance,
    });
  }

  return {
    trades,
    metrics: calculateMetrics({
      trades,
      equityCurve,
      startingBalance: settings.startingBalance,
      finalBalance: balance,
    }),
  };
}

function openPosition({ candle, allocatedBalance, balance, feeRate, slippageRate }) {
  const entryPrice = candle.open * (1 + slippageRate);
  const entryFee = allocatedBalance * feeRate;
  const quantity = (allocatedBalance - entryFee) / entryPrice;

  return {
    balance: balance - allocatedBalance,
    position: {
      entryTime: candle.time,
      entryPrice,
      quantity,
      investedCapital: allocatedBalance,
    },
  };
}

function closePosition({
  position,
  candle,
  exitPrice,
  balance,
  feeRate,
  slippageRate,
}) {
  const executionPrice = exitPrice * (1 - slippageRate);
  const grossValue = position.quantity * executionPrice;
  const exitFee = grossValue * feeRate;
  const netValue = grossValue - exitFee;
  const profit = netValue - position.investedCapital;

  return {
    balance: balance + netValue,
    trade: {
      entryTime: position.entryTime,
      exitTime: candle.time,
      entryPrice: position.entryPrice,
      exitPrice: executionPrice,
      quantity: position.quantity,
      profit,
      returnPct:
        position.investedCapital > 0 ? (profit / position.investedCapital) * 100 : 0,
    },
  };
}

function markToMarket(balance, position, closePrice, feeRate) {
  if (!position) {
    return balance;
  }

  const estimatedValue = position.quantity * closePrice * (1 - feeRate);
  return balance + estimatedValue;
}

function getManagedExitPrice(position, candle, settings) {
  if (settings.stopLossPct) {
    const stopPrice = position.entryPrice * (1 - settings.stopLossPct);

    if (candle.low <= stopPrice) {
      return stopPrice;
    }
  }

  if (settings.takeProfitPct) {
    const takeProfitPrice = position.entryPrice * (1 + settings.takeProfitPct);

    if (candle.high >= takeProfitPrice) {
      return takeProfitPrice;
    }
  }

  return null;
}

export { SIGNALS };
