export type AuditChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'passcode',
  'token',
  'accessToken',
  'refreshToken',
  'otp',
  'pin',
  'secret',
];

const normalize = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value ?? null;
};

const sameValue = (a: unknown, b: unknown) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

const isSensitive = (field: string, sensitiveFields: string[]) => {
  const lowerField = field.toLowerCase();
  return sensitiveFields.some((name) => lowerField.includes(name.toLowerCase()));
};

export const diffChanges = <T extends Record<string, unknown>>(
  original: Partial<T> | null | undefined,
  current: Partial<T> | null | undefined,
  fields?: Array<keyof T | string>,
  sensitiveFields = DEFAULT_SENSITIVE_FIELDS,
): AuditChange[] => {
  const before = (original || {}) as Record<string, unknown>;
  const after = (current || {}) as Record<string, unknown>;
  const keys = fields?.map(String) || Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return keys.reduce<AuditChange[]>((changes, field) => {
    const oldValue = normalize(before[field]);
    const newValue = normalize(after[field]);
    if (sameValue(oldValue, newValue)) return changes;

    const hidden = isSensitive(field, sensitiveFields);
    changes.push({
      field,
      oldValue: hidden ? '[hidden]' : oldValue,
      newValue: hidden ? '[changed]' : newValue,
    });
    return changes;
  }, []);
};
