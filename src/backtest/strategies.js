import { SIGNALS } from "./engine";

export const STRATEGY_OPTIONS = [
  { value: "ma-crossover", label: "MA Crossover (20 / 50)" },
];

export const strategyRegistry = {
  "ma-crossover": createMovingAverageCrossoverStrategy(),
};

function createMovingAverageCrossoverStrategy() {
  const fastPeriod = 20;
  const slowPeriod = 50;

  return {
    id: "ma-crossover",
    label: "MA Crossover (20 / 50)",
    lookback: slowPeriod,
    prepare(candles) {
      return {
        fast: buildSimpleMovingAverage(candles, fastPeriod),
        slow: buildSimpleMovingAverage(candles, slowPeriod),
      };
    },
    getSignal({ index, indicators, position }) {
      const previousIndex = index - 1;
      const earlierIndex = index - 2;

      if (earlierIndex < 0) {
        return SIGNALS.HOLD;
      }

      const prevFast = indicators.fast[previousIndex];
      const prevSlow = indicators.slow[previousIndex];
      const priorFast = indicators.fast[earlierIndex];
      const priorSlow = indicators.slow[earlierIndex];

      if (
        !Number.isFinite(prevFast) ||
        !Number.isFinite(prevSlow) ||
        !Number.isFinite(priorFast) ||
        !Number.isFinite(priorSlow)
      ) {
        return SIGNALS.HOLD;
      }

      const crossedUp = priorFast <= priorSlow && prevFast > prevSlow;
      const crossedDown = priorFast >= priorSlow && prevFast < prevSlow;

      if (!position && crossedUp) {
        return SIGNALS.BUY;
      }

      if (position && crossedDown) {
        return SIGNALS.SELL;
      }

      return SIGNALS.HOLD;
    },
  };
}

function buildSimpleMovingAverage(candles, period) {
  const values = new Array(candles.length).fill(null);
  let rollingSum = 0;

  for (let index = 0; index < candles.length; index += 1) {
    rollingSum += candles[index].close;

    if (index >= period) {
      rollingSum -= candles[index - period].close;
    }

    if (index >= period - 1) {
      values[index] = rollingSum / period;
    }
  }

  return values;
}
