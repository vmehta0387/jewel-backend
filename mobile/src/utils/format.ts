export const formatCurrency = (value: number, currency = 'USD') => {
  if (Number.isNaN(value)) return `${currency} 0.00`;
  return `${currency} ${value.toFixed(2)}`;
};

export const formatNumber = (value: number, decimals = 2) => {
  if (Number.isNaN(value)) return `0.${'0'.repeat(decimals)}`;
  return value.toFixed(decimals);
};

export const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};
