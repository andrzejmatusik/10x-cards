/**
 * Custom hook for text input validation
 * Validates text length in real-time for generation requirements
 */

import { useMemo } from "react";
import { GenerationConstraints } from "@/types";
import type { TextInputValidation } from "@/types";

/**
 * Hook to validate source text length
 * @param text - Text to validate
 * @returns Validation result with status and message
 */
export function useTextValidation(text: string): TextInputValidation {
  return useMemo(() => {
    const length = text.length;
    const min = GenerationConstraints.SOURCE_TEXT_MIN_LENGTH; // 1000
    const max = GenerationConstraints.SOURCE_TEXT_MAX_LENGTH; // 10000

    const isTooShort = length > 0 && length < min;
    const isTooLong = length > max;
    const isValid = length >= min && length <= max;

    let message: string | null = null;
    let messageType: "error" | "success" | "info" = "info";

    if (isTooShort) {
      message = `Tekst jest za krótki. Minimum ${min} znaków. (aktualnie: ${length})`;
      messageType = "error";
    } else if (isTooLong) {
      message = `Tekst jest za długi. Maksimum ${max} znaków. (aktualnie: ${length})`;
      messageType = "error";
    } else if (isValid) {
      message = `Tekst gotowy do generowania (${length} znaków)`;
      messageType = "success";
    } else if (length === 0) {
      message = `Wklej tekst do wygenerowania fiszek (${min}-${max} znaków)`;
      messageType = "info";
    }

    return { isValid, isTooShort, isTooLong, message, messageType };
  }, [text]);
}
