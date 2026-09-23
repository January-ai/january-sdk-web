export function init(signal?: AbortSignal): RequestInit | undefined { return signal ? { signal } : undefined }

/** Parses an ISO-8601 calendar date (`YYYY-MM-DD`) into the UTC midnight the transport serializes back as that date. */
export function parseDate(value: string, name: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${name} must be an ISO-8601 date.`);
  const result = new Date(`${value}T00:00:00.000Z`);
  // Date rolls impossible days forward (2026-02-31 becomes March 3), so the parsed day must read back unchanged.
  if (Number.isNaN(result.getTime()) || formatDate(result) !== value) throw new TypeError(`${name} must be an ISO-8601 date.`);
  return result;
}

export function formatDate(value: Date): string { return value.toISOString().slice(0, 10) }

export function parseDateTime(value: string, name: string): Date {
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw new TypeError(`${name} must be an ISO-8601 date-time.`);
  return result;
}

export function requireFiniteNumber(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive number.`);
  }
  return value;
}

export function requireUnit<T extends string>(value: string, allowed: readonly T[], name: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new TypeError(`${name} must be one of ${allowed.join(', ')}.`);
  }
  return value as T;
}
