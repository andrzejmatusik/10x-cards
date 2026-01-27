/**
 * Authentication middleware for API routes
 * Verifies JWT tokens and extracts user information
 */

import type { MiddlewareHandler } from "astro";

/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Authentication middleware that verifies JWT tokens
 * Extracts user information and stores it in context.locals
 *
 * Usage: Apply to routes that require authentication
 *
 * @throws AuthenticationError if authentication fails
 */
export const authMiddleware: MiddlewareHandler = async (context, next) => {
  // Only apply to API routes
  if (!context.url.pathname.startsWith("/api")) {
    return next();
  }

  // Extract Authorization header
  const authHeader = context.request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing authorization header");
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.substring(7);

  // Verify token using Supabase
  const {
    data: { user },
    error,
  } = await context.locals.supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthenticationError("Invalid or expired authentication token");
  }

  // Store user information in locals for use in routes
  context.locals.userId = user.id;
  context.locals.userEmail = user.email || undefined;

  return next();
};
