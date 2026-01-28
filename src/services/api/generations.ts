/**
 * Generations API client
 * Handles AI flashcard generation requests
 */

import type { CreateGenerationCommand, CreateGenerationResponse } from "@/types";
import { apiClient } from "./client";

/**
 * Generate flashcards from source text using LLM
 * @param command - Generation command with source text and model
 * @returns Generation response with proposed flashcards
 * @throws Error with message for UI display
 */
export async function generateFlashcards(command: CreateGenerationCommand): Promise<CreateGenerationResponse> {
  try {
    const response = await apiClient.post<CreateGenerationResponse>("/api/generations", command, {
      timeout: 30000, // 30 seconds for LLM call
    });
    return response.data;
  } catch (error) {
    // Parse error and throw user-friendly message
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { data?: { error?: { code: string; message?: string } } } };
      const apiError = axiosError.response?.data?.error;

      if (apiError) {
        switch (apiError.code) {
          case "VALIDATION_ERROR":
            throw new Error("Nieprawidłowa długość tekstu. Wymagane: 1000-10000 znaków.");
          case "LLM_GENERATION_FAILED":
            throw new Error("Nie udało się wygenerować fiszek. Spróbuj ponownie z innym tekstem.");
          case "RATE_LIMIT_EXCEEDED":
            throw new Error("Przekroczono limit generacji (10 na godzinę). Spróbuj ponownie później.");
          case "UNAUTHORIZED":
            throw new Error("Sesja wygasła. Zaloguj się ponownie.");
          default:
            throw new Error(apiError.message || "Wystąpił błąd podczas generowania fiszek.");
        }
      }
    }

    // Network or timeout error
    if (error && typeof error === "object" && "code" in error && error.code === "ECONNABORTED") {
      throw new Error("Generowanie trwa zbyt długo. Sprawdź połączenie z internetem.");
    }

    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("timeout")
    ) {
      throw new Error("Generowanie trwa zbyt długo. Sprawdź połączenie z internetem.");
    }

    if (error && typeof error === "object" && "response" in error && !error.response) {
      throw new Error("Sprawdź połączenie z internetem i spróbuj ponownie.");
    }

    throw new Error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
  }
}
