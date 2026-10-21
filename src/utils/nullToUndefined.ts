/**
 * Utility to convert null values to undefined
 * Useful for compatibility between API responses (which use null) and React props (which expect undefined)
 */

export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

export function nullToString(value: string | null | undefined, defaultValue = ''): string {
  return value ?? defaultValue;
}

export function nullToNumber(value: number | null | undefined, defaultValue = 0): number {
  return value ?? defaultValue;
}
