export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

export function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}
