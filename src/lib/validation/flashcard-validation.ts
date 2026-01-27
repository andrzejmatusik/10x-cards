/**
 * Flashcard validation utilities using Zod schemas
 * Validates input data for flashcard operations
 */

import { z } from "zod";
import { FlashcardConstraints } from "@/types";

/**
 * Custom validation error class for flashcard operations
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public constraint: string,
    public details: Record<string, unknown>
  ) {
    super(`Validation failed for field: ${field}`);
    this.name = "ValidationError";
  }
}

/**
 * Zod schema for creating a manual flashcard
 * Validates front and back text according to database constraints
 */
export const createFlashcardCommandSchema = z.object({
  front: z
    .string({
      required_error: "Front text is required",
      invalid_type_error: "Front text must be a string",
    })
    .min(1, "Front text cannot be empty")
    .max(
      FlashcardConstraints.FRONT_MAX_LENGTH,
      `Front text must not exceed ${FlashcardConstraints.FRONT_MAX_LENGTH} characters`
    )
    .refine((val) => val.trim().length > 0, {
      message: "Front text cannot be empty or whitespace only",
    }),
  back: z
    .string({
      required_error: "Back text is required",
      invalid_type_error: "Back text must be a string",
    })
    .min(1, "Back text cannot be empty")
    .max(
      FlashcardConstraints.BACK_MAX_LENGTH,
      `Back text must not exceed ${FlashcardConstraints.BACK_MAX_LENGTH} characters`
    )
    .refine((val) => val.trim().length > 0, {
      message: "Back text cannot be empty or whitespace only",
    }),
});

/**
 * Type inferred from the create flashcard command schema
 */
export type CreateFlashcardCommandSchema = z.infer<typeof createFlashcardCommandSchema>;

/**
 * Validates and parses create flashcard command
 * Throws ValidationError with detailed information if validation fails
 *
 * @param command - Unknown input to validate
 * @returns Validated CreateFlashcardCommand
 * @throws ValidationError if validation fails
 */
export function validateCreateFlashcardCommand(command: unknown): CreateFlashcardCommandSchema {
  try {
    return createFlashcardCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Extract first error for cleaner response
      const firstError = error.errors[0];
      const field = firstError.path[0]?.toString() || "unknown";

      throw new ValidationError(field, "validation_failed", {
        message: firstError.message,
        field,
        value: firstError.path.length > 0 ? undefined : command,
      });
    }
    throw error;
  }
}
