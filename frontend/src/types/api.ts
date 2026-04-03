/* -------------------------------------------------------------------------- */
/*  Shared API types (RFC 7807 errors, pagination, wrappers)                  */
/* -------------------------------------------------------------------------- */

/**
 * RFC 7807 Problem Details response shape returned by the backend on errors.
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ApiError {
  /** URI reference that identifies the problem type. */
  type: string;
  /** Short, human-readable summary of the problem. */
  title: string;
  /** HTTP status code. */
  status: number;
  /** Human-readable explanation specific to this occurrence. */
  detail: string;
  /** URI reference that identifies the specific occurrence. */
  instance?: string;
  /** Optional field-level validation errors (keyed by field path). */
  errors?: Record<string, string[]>;
}

/**
 * Generic wrapper the backend uses for single-resource responses.
 */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Paginated list response envelope.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
