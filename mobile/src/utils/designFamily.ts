const compact = (value?: string | null) => String(value || '').trim();

export const getDesignFamilyKey = (designNo?: string | null) => {
  const cleaned = compact(designNo).replace(/-V\d+$/i, '').trim();
  if (!cleaned) return '';

  const parts = cleaned
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2 && /^[A-Za-z]+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    return `${parts[0]}-${parts[1]}`.toLowerCase();
  }

  return cleaned.toLowerCase();
};
