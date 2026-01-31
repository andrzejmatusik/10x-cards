/**
 * Flashcards API Endpoint
 * Handles CRUD operations for flashcards
 */

import type { APIRoute } from "astro";

import { validationError, unauthorizedError, rateLimitError, internalError } from "@/lib/api/error-builder";
import { validateCreateFlashcardCommand, ValidationError } from "@/lib/validation/flashcard-validation";
import { AuthenticationError } from "@/middleware/auth";
import { RateLimitError } from "@/middleware/rate-limit";
import { FlashcardService } from "@/services/flashcard-service";
import { supabaseServerClient } from "@/db/supabase.server.client";

/**
 * POST /api/flashcards
 * Creates a new manual flashcard
 *
 * Request Body:
 * {
 *   "front": "Question text (max 200 chars)",
 *   "back": "Answer text (max 500 chars)"
 * }
 *
 * Response (201 Created):
 * {
 *   "id": 123,
 *   "front": "Question text",
 *   "back": "Answer text",
 *   "source": "manual",
 *   "generation_id": null,
 *   "user_id": "uuid",
 *   "created_at": "2025-01-27T10:00:00Z",
 *   "updated_at": "2025-01-27T10:00:00Z"
 * }
 *
 * Error Responses:
 * - 400: Validation error (invalid input)
 * - 401: Unauthorized (missing/invalid token)
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return validationError("Invalid JSON in request body", {
        message: "Request body must be valid JSON",
      });
    }

    // Validate command using Zod schema
    let validatedCommand;
    try {
      validatedCommand = validateCreateFlashcardCommand(body);
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message, error.details);
      }
      throw error;
    }

    // Get user context from middleware (set by authMiddleware)
    const userId = locals.userId;
    if (!userId) {
      return unauthorizedError("User not authenticated");
    }

    // Create flashcard using service
    const flashcardService = new FlashcardService(supabaseServerClient);
    const flashcard = await flashcardService.createManualFlashcard(validatedCommand, userId);

    // Return created flashcard with 201 status
    return new Response(JSON.stringify(flashcard), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof AuthenticationError) {
      return unauthorizedError(error.message);
    }

    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      return rateLimitError(error.resetTime);
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return validationError("Invalid JSON in request body");
    }

    // Log unexpected errors for monitoring
    console.error("Unexpected error in POST /api/flashcards:", error);

    // Return generic internal error
    return internalError("An unexpected error occurred while creating flashcard");
  }
};
