export const formatCurrency = (value: number | string | null | undefined, currency = 'USD') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${currency} 0.00`;
  return `${currency} ${numeric.toFixed(2)}`;
};

export const formatNumber = (value: number | string | null | undefined, decimals = 2) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `0.${'0'.repeat(decimals)}`;
  return numeric.toFixed(decimals);
};

export const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};
