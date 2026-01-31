/**
 * Generations API Endpoint
 * Handles AI flashcard generation from text
 */

import type { APIRoute } from "astro";
import type { CreateGenerationCommand, CreateGenerationResponse } from "@/types";
import { validationError, unauthorizedError, rateLimitError, internalError } from "@/lib/api/error-builder";
import { AuthenticationError } from "@/middleware/auth";
import { RateLimitError } from "@/middleware/rate-limit";
import { supabaseServerClient } from "@/db/supabase.server.client";
import { createHash } from "crypto";

/**
 * POST /api/generations
 * Generate flashcards from source text using LLM
 *
 * Request Body:
 * {
 *   "source_text": "Text content (1000-10000 chars)",
 *   "model": "openai/gpt-4"
 * }
 *
 * Response (201 Created):
 * {
 *   "id": 46,
 *   "user_id": "uuid",
 *   "model": "openai/gpt-4",
 *   "generated_count": 5,
 *   "accepted_unedited_count": null,
 *   "accepted_edited_count": null,
 *   "source_text_hash": "abc123...",
 *   "source_text_length": 2500,
 *   "generation_duration": 3450,
 *   "created_at": "2025-01-27T13:00:00Z",
 *   "proposed_flashcards": [
 *     {
 *       "front": "Question?",
 *       "back": "Answer."
 *     }
 *   ]
 * }
 *
 * Error Responses:
 * - 400: Validation error (text length not 1000-10000)
 * - 401: Unauthorized (missing/invalid token)
 * - 422: LLM generation failed
 * - 429: Rate limit exceeded (10 per hour)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let body: CreateGenerationCommand;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // Validate command
    const { source_text, model } = body;

    if (!source_text || typeof source_text !== "string") {
      return validationError("source_text is required and must be a string");
    }

    if (source_text.length < 1000 || source_text.length > 10000) {
      return validationError("Text length not between 1000-10000 characters", {
        field: "source_text",
        constraint: "length",
        min: 1000,
        max: 10000,
        actual: source_text.length,
      });
    }

    if (!model || typeof model !== "string") {
      return validationError("model is required and must be a string");
    }

    // Get user context
    const userId = locals.userId;
    if (!userId) {
      return unauthorizedError("User not authenticated");
    }

    // TODO: Implement actual LLM generation
    // For now, return mock flashcards
    const startTime = Date.now();

    // Mock: Generate 5 flashcards
    const proposedFlashcards = [
      {
        front: "Co to jest spaced repetition?",
        back: "Technika uczenia się, która polega na przeglądaniu informacji w rosnących odstępach czasu.",
      },
      {
        front: "Co to jest active recall?",
        back: "Metoda nauki, w której aktywnie stymulujemy pamięć podczas uczenia się.",
      },
      {
        front: "Jakie są korzyści ze spaced repetition?",
        back: "Lepsza retencja informacji, efektywniejsze uczenie się i długotrwała pamięć.",
      },
      {
        front: "Jak działa algorytm SM-2?",
        back: "Algorytm oblicza optymalne odstępy między powtórkami na podstawie oceny trudności.",
      },
      {
        front: "Co to jest ease factor?",
        back: "Współczynnik określający łatwość zapamiętania danej fiszki, używany w algorytmach spaced repetition.",
      },
    ];

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Create hash of source text
    const sourceTextHash = createHash("sha256").update(source_text).digest("hex");

    // Insert generation into database
    const { data: generation, error: insertError } = await supabaseServerClient
      .from("generations")
      .insert({
        user_id: userId,
        model,
        generated_count: proposedFlashcards.length,
        source_text_hash: sourceTextHash,
        source_text_length: source_text.length,
        generation_duration: duration,
      })
      .select()
      .single();

    if (insertError || !generation) {
      // eslint-disable-next-line no-console
      console.error("Error inserting generation:", insertError);
      return internalError("Failed to save generation to database");
    }

    // Create response with database record
    const response: CreateGenerationResponse = {
      id: generation.id,
      user_id: generation.user_id,
      model: generation.model,
      generated_count: generation.generated_count,
      accepted_unedited_count: generation.accepted_unedited_count,
      accepted_edited_count: generation.accepted_edited_count,
      source_text_hash: generation.source_text_hash,
      source_text_length: generation.source_text_length,
      generation_duration: generation.generation_duration,
      created_at: generation.created_at,
      updated_at: generation.updated_at,
      proposed_flashcards: proposedFlashcards,
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
      return rateLimitError(error.resetTime);
    }

    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/generations:", error);
    return internalError("An unexpected error occurred while generating flashcards");
  }
};
