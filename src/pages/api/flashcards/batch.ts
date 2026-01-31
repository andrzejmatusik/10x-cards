/**
 * Batch Flashcards API Endpoint
 * Handles batch creation of flashcards from AI generation
 */

import type { APIRoute } from "astro";
import type { CreateBatchFlashcardsCommand, CreateBatchFlashcardsResponse, FlashcardDTO } from "@/types";
import { validationError, unauthorizedError, internalError } from "@/lib/api/error-builder";
import { AuthenticationError } from "@/middleware/auth";
import { RateLimitError } from "@/middleware/rate-limit";
import { supabaseServerClient } from "@/db/supabase.server.client";

/**
 * POST /api/flashcards/batch
 * Create multiple flashcards from AI generation
 *
 * Request Body:
 * {
 *   "generation_id": 45,
 *   "flashcards": [
 *     {
 *       "front": "Question (max 200 chars)",
 *       "back": "Answer (max 500 chars)",
 *       "source": "ai-full" | "ai-edited"
 *     }
 *   ]
 * }
 *
 * Response (201 Created):
 * {
 *   "created_count": 2,
 *   "flashcards": [...]
 * }
 *
 * Error Responses:
 * - 400: Validation error (invalid input)
 * - 401: Unauthorized (missing/invalid token)
 * - 404: Generation not found or doesn't belong to user
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let body: CreateBatchFlashcardsCommand;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // Validate command
    const { generation_id, flashcards } = body;

    if (!generation_id || typeof generation_id !== "number") {
      return validationError("generation_id is required and must be a number");
    }

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      return validationError("flashcards must be a non-empty array");
    }

    // Validate each flashcard
    for (let i = 0; i < flashcards.length; i++) {
      const flashcard = flashcards[i];

      if (!flashcard.front || typeof flashcard.front !== "string") {
        return validationError(`flashcards[${i}].front is required and must be a string`);
      }

      if (flashcard.front.length > 200) {
        return validationError(`flashcards[${i}].front exceeds maximum length of 200 characters`, {
          field: `flashcards[${i}].front`,
          constraint: "max_length",
          max: 200,
          actual: flashcard.front.length,
        });
      }

      if (!flashcard.back || typeof flashcard.back !== "string") {
        return validationError(`flashcards[${i}].back is required and must be a string`);
      }

      if (flashcard.back.length > 500) {
        return validationError(`flashcards[${i}].back exceeds maximum length of 500 characters`, {
          field: `flashcards[${i}].back`,
          constraint: "max_length",
          max: 500,
          actual: flashcard.back.length,
        });
      }

      if (!["ai-full", "ai-edited"].includes(flashcard.source)) {
        return validationError(`flashcards[${i}].source must be "ai-full" or "ai-edited"`);
      }
    }

    // Get user context
    const userId = locals.userId;
    if (!userId) {
      return unauthorizedError("User not authenticated");
    }

    // Verify generation belongs to user and exists
    const { data: generation, error: generationError } = await supabaseServerClient
      .from("generations")
      .select("id, user_id")
      .eq("id", generation_id)
      .eq("user_id", userId)
      .single();

    if (generationError || !generation) {
      return validationError("Generation not found or does not belong to you", {
        field: "generation_id",
        code: "NOT_FOUND",
      });
    }

    // Insert flashcards into database
    const flashcardsToInsert = flashcards.map((flashcard) => ({
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: generation_id,
      user_id: userId,
    }));

    const { data: insertedFlashcards, error: insertError } = await supabaseServerClient
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select();

    if (insertError || !insertedFlashcards) {
      // eslint-disable-next-line no-console
      console.error("Error inserting flashcards:", insertError);
      return internalError("Failed to save flashcards to database");
    }

    // Transform database records to DTOs
    const createdFlashcards: FlashcardDTO[] = insertedFlashcards.map((flashcard) => ({
      id: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: flashcard.generation_id,
      user_id: flashcard.user_id,
      created_at: flashcard.created_at,
      updated_at: flashcard.updated_at,
    }));

    const response: CreateBatchFlashcardsResponse = {
      created_count: createdFlashcards.length,
      flashcards: createdFlashcards,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return unauthorizedError(error.message);
    }

    if (error instanceof RateLimitError) {
      return validationError("Rate limit exceeded");
    }

    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/flashcards/batch:", error);
    return internalError("An unexpected error occurred while creating flashcards");
  }
};
