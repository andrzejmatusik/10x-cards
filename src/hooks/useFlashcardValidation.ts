/**
 * Custom hook for flashcard field validation
 * Validates front/back fields during editing
 */

import { useMemo } from "react";
import { FlashcardConstraints } from "@/types";
import type { FlashcardValidationResult, FlashcardValidationErrors } from "@/types";

/**
 * Hook to validate flashcard fields
 * @param front - Front text of flashcard
 * @param back - Back text of flashcard
 * @returns Validation result with isValid flag and errors object
 */
export function useFlashcardValidation(front: string, back: string): FlashcardValidationResult {
  return useMemo(() => {
    const maxFront = FlashcardConstraints.FRONT_MAX_LENGTH; // 200
    const maxBack = FlashcardConstraints.BACK_MAX_LENGTH; // 500

    const errors: FlashcardValidationErrors = {};

    // Validate front
    if (!front.trim()) {
      errors.front = "Przód fiszki jest wymagany";
    } else if (front.length > maxFront) {
      errors.front = `Maksymalna długość: ${maxFront} znaków (aktualnie: ${front.length})`;
    }

    // Validate back
    if (!back.trim()) {
      errors.back = "Tył fiszki jest wymagany";
    } else if (back.length > maxBack) {
      errors.back = `Maksymalna długość: ${maxBack} znaków (aktualnie: ${back.length})`;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [front, back]);
}
