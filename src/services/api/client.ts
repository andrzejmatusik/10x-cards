/**
 * Base API client configuration
 * Axios instance with authentication and error handling
 */

import axios, { type AxiosError } from "axios";

/**
 * Base axios instance with default configuration
 */
export const apiClient = axios.create({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  timeout: 30000, // 30 seconds default
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor - adds JWT token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage or cookie
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handles global errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Create axios instance with custom timeout
 * @param timeout - Timeout in milliseconds
 */
export function createApiClient(timeout: number) {
  return axios.create({
    ...apiClient.defaults,
    timeout,
  });
}
