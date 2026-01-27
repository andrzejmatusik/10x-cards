/**
 * Flashcard service for managing flashcard operations
 * Handles business logic and database interactions
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import DOMPurify from "isomorphic-dompurify";

import type { Database } from "@/db/database.types";
import type { CreateFlashcardCommand, FlashcardDTO } from "@/types";

/**
 * Service class for flashcard operations
 */
export class FlashcardService {
  /**
   * Creates a new FlashcardService instance
   * @param supabase - Authenticated Supabase client from context.locals
   */
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Creates a new manual flashcard
   * Sanitizes input, sets source to 'manual', and associates with user
   *
   * @param command - Validated flashcard creation command
   * @param userId - Authenticated user's ID from JWT
   * @returns Created flashcard with all metadata
   * @throws Error if database operation fails
   */
  async createManualFlashcard(command: CreateFlashcardCommand, userId: string): Promise<FlashcardDTO> {
    // Sanitize input to prevent XSS attacks
    const sanitizedFront = DOMPurify.sanitize(command.front, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: [], // Strip all attributes
    });

    const sanitizedBack = DOMPurify.sanitize(command.back, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: [], // Strip all attributes
    });

    // Insert flashcard with manual source and null generation_id
    const { data, error } = await this.supabase
      .from("flashcards")
      .insert({
        front: sanitizedFront,
        back: sanitizedBack,
        source: "manual",
        generation_id: null,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error("Failed to create flashcard");
    }

    if (!data) {
      throw new Error("No data returned from database");
    }

    return data as FlashcardDTO;
  }
}
