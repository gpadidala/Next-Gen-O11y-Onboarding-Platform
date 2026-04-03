/* -------------------------------------------------------------------------- */
/*  Formatting utility functions                                              */
/* -------------------------------------------------------------------------- */

/**
 * Format an ISO date string into a human-readable locale date.
 *
 * @param iso - ISO 8601 date string (e.g. "2026-03-15T08:30:00Z").
 * @param options - Intl.DateTimeFormat options override.
 * @returns Formatted date string (e.g. "Mar 15, 2026").
 */
export function formatDate(
  iso: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return new Intl.DateTimeFormat('en-US', defaults).format(date);
}

/**
 * Format a number as a percentage string.
 *
 * @param value - The numeric value (0-100 or 0-1 depending on `isDecimal`).
 * @param decimals - Number of decimal places (default: 1).
 * @param isDecimal - If true, treats value as 0-1 scale (default: false).
 * @returns Formatted string (e.g. "42.5%").
 */
export function formatPercentage(
  value: number,
  decimals = 1,
  isDecimal = false,
): string {
  const pct = isDecimal ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format a byte count into a human-readable string (KB, MB, GB, TB).
 *
 * @param bytes - Number of bytes.
 * @param decimals - Decimal precision (default: 2).
 * @returns Formatted string (e.g. "1.23 GB").
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return `-${formatBytes(-bytes, decimals)}`;

  const k = 1024;
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  );

  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimals)} ${units[i]}`;
}

/**
 * Truncate text to a maximum length with an ellipsis.
 *
 * @param text - The input string.
 * @param maxLength - Maximum character count (default: 100).
 * @returns Truncated string with "..." appended when shortened.
 */
export function truncateText(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

/**
 * Return a word in singular or plural form based on count.
 *
 * @param count - The quantity.
 * @param singular - Singular form (e.g. "item").
 * @param plural - Optional explicit plural form. Defaults to singular + "s".
 * @returns Pluralised string (e.g. "3 items", "1 item").
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  const form = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${form}`;
}
