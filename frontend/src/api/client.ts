/* -------------------------------------------------------------------------- */
/*  Axios API client with interceptors                                        */
/* -------------------------------------------------------------------------- */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiError } from '@/types/api';

/* ---- Constants ---- */

const AUTH_TOKEN_KEY = 'obs_auth_token';
const LOGIN_PATH = '/login';

/* ---- Helper: build base URL from env ---- */

function getBaseUrl(): string {
  // Vite injects import.meta.env at build time
  return (
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
  );
}

/* ---- Create Axios instance ---- */

const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/* ---- Request interceptor: attach auth token ---- */

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/* ---- Response interceptor: centralised error handling ---- */

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (!error.response) {
      // Network error / timeout
      const networkError: ApiError = {
        type: 'about:blank',
        title: 'Network Error',
        status: 0,
        detail:
          'Unable to reach the server. Please check your network connection and try again.',
      };
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;

    // FastAPI wraps RFC 7807 errors as { detail: { type, title, status, detail, error_code } }
    // Unwrap the nested object so consumers always get a flat ApiError.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data as any;
    const nested = raw?.detail && typeof raw.detail === 'object' ? raw.detail : null;
    const resolvedTitle  = nested?.title  ?? raw?.title  ?? 'Server Error';
    const resolvedDetail = nested?.detail ?? (typeof raw?.detail === 'string' ? raw.detail : null)
      ?? 'An unexpected error occurred. Please try again later.';
    const resolvedType   = nested?.type   ?? raw?.type   ?? 'about:blank';

    switch (status) {
      case 401: {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        if (window.location.pathname !== LOGIN_PATH) {
          window.location.href = LOGIN_PATH;
        }
        return Promise.reject({
          type: resolvedType,
          title: 'Unauthorized',
          status: 401,
          detail: resolvedDetail !== 'An unexpected error occurred. Please try again later.'
            ? resolvedDetail
            : 'Your session has expired. Please log in again.',
        } as ApiError);
      }

      case 422: {
        // Pydantic validation: detail is an array of { loc, msg, type }
        let detail422 = 'One or more fields failed validation.';
        if (Array.isArray(raw?.detail)) {
          detail422 = raw.detail.map((e: { msg: string; loc?: string[] }) =>
            e.loc ? `${e.loc.slice(1).join('.')}: ${e.msg}` : e.msg,
          ).join('; ');
        } else {
          detail422 = resolvedDetail;
        }
        return Promise.reject({
          type: resolvedType,
          title: 'Validation Error',
          status: 422,
          detail: detail422,
          errors: raw?.errors ?? {},
        } as ApiError);
      }

      default: {
        return Promise.reject({
          type: resolvedType,
          title: resolvedTitle,
          status,
          detail: resolvedDetail,
          errors: raw?.errors,
        } as ApiError);
      }
    }
  },
);

/* ---- Exports ---- */

export { apiClient, AUTH_TOKEN_KEY };
export default apiClient;
