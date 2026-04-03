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

    switch (status) {
      case 401: {
        // Clear stale token and redirect to login
        localStorage.removeItem(AUTH_TOKEN_KEY);
        if (window.location.pathname !== LOGIN_PATH) {
          window.location.href = LOGIN_PATH;
        }
        const authError: ApiError = {
          type: data?.type ?? 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail:
            data?.detail ?? 'Your session has expired. Please log in again.',
        };
        return Promise.reject(authError);
      }

      case 422: {
        // Validation errors - parse field-level details
        const validationError: ApiError = {
          type: data?.type ?? 'about:blank',
          title: data?.title ?? 'Validation Error',
          status: 422,
          detail:
            data?.detail ?? 'One or more fields failed validation.',
          errors: data?.errors ?? {},
        };
        return Promise.reject(validationError);
      }

      default: {
        // All other errors (400, 403, 404, 500, etc.)
        const genericError: ApiError = {
          type: data?.type ?? 'about:blank',
          title: data?.title ?? 'Server Error',
          status,
          detail:
            data?.detail ??
            'An unexpected error occurred. Please try again later.',
          errors: data?.errors,
        };
        return Promise.reject(genericError);
      }
    }
  },
);

/* ---- Exports ---- */

export { apiClient, AUTH_TOKEN_KEY };
export default apiClient;
