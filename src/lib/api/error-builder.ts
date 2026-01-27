/**
 * API error response builder utilities
 * Provides consistent error response formatting across all endpoints
 */

import type { ApiErrorResponse, ApiErrorCode } from "@/types";

/**
 * Builds a standardized error response object
 *
 * @param code - Error code from ApiErrorCode enum
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns Standardized error response object
 */
export function buildErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Creates a JSON Response with error data and appropriate status code
 *
 * @param code - Error code from ApiErrorCode enum
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code
 * @param details - Optional additional error details
 * @returns Response object with JSON error body
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  statusCode: number,
  details?: Record<string, unknown>
): Response {
  return new Response(JSON.stringify(buildErrorResponse(code, message, details)), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Creates a 400 Bad Request validation error response
 */
export function validationError(message: string, details?: Record<string, unknown>): Response {
  return createErrorResponse("VALIDATION_ERROR", message, 400, details);
}

/**
 * Creates a 401 Unauthorized error response
 */
export function unauthorizedError(message = "Unauthorized"): Response {
  return createErrorResponse("UNAUTHORIZED", message, 401);
}

/**
 * Creates a 404 Not Found error response
 */
export function notFoundError(message = "Resource not found"): Response {
  return createErrorResponse("NOT_FOUND", message, 404);
}

/**
 * Creates a 429 Too Many Requests rate limit error response
 */
export function rateLimitError(
  resetTime: number,
  message = "Rate limit exceeded. Maximum 100 requests per minute allowed"
): Response {
  const response = createErrorResponse("RATE_LIMIT_EXCEEDED", message, 429);

  // Add rate limit reset header
  response.headers.set("X-RateLimit-Reset", Math.floor(resetTime / 1000).toString());

  return response;
}

/**
 * Creates a 500 Internal Server Error response
 */
export function internalError(message = "An unexpected error occurred"): Response {
  return createErrorResponse("INTERNAL_ERROR", message, 500);
}
